import { supabase } from './supabase';

/**
 * Upload a receipt image to Supabase Storage
 * @param file - The image file to upload
 * @param expenseId - Optional expense ID to use in filename
 * @returns The public URL of the uploaded image
 */
export async function uploadReceipt(file: File, expenseId?: string): Promise<string> {
    try {
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${expenseId || Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload file to Supabase Storage
        const { data, error } = await supabase.storage
            .from('receipts')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            throw error;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('receipts')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error('Error uploading receipt:', error);
        throw new Error('Falha ao fazer upload da nota fiscal');
    }
}

/**
 * Delete a receipt image from Supabase Storage
 * @param url - The public URL of the image to delete
 */
export async function deleteReceipt(url: string): Promise<void> {
    try {
        // Extract filename from URL
        const fileName = url.split('/').pop();
        if (!fileName) throw new Error('Invalid URL');

        const { error } = await supabase.storage
            .from('receipts')
            .remove([fileName]);

        if (error) {
            throw error;
        }
    } catch (error) {
        console.error('Error deleting receipt:', error);
        throw new Error('Falha ao deletar nota fiscal');
    }
}
