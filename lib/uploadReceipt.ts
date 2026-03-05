// Developer: Adrian Luciano De Sena Ribeiro - MG | Tel: 31 995347802
import { supabase } from './supabase';

/**
 * Upload a receipt image to the backend server (Supabase Storage)
 * @param file - The image file to upload
 * @param expenseId - Optional expense ID (unused in simple upload, kept for compat)
 * @returns The public URL of the uploaded image
 */
export async function uploadReceipt(file: File, expenseId?: string): Promise<string> {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `receipts/${fileName}`; // Or organize by expenseId if needed

        const { error: uploadError } = await supabase.storage
            .from('receipts') // Ensure this bucket exists in Supabase
            .upload(filePath, file);

        if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error('Falha ao fazer upload da nota fiscal (Storage)');
        }

        const { data } = supabase.storage
            .from('receipts')
            .getPublicUrl(filePath);

        return data.publicUrl;
    } catch (error) {
        console.error('Error uploading receipt:', error);
        throw new Error('Falha ao fazer upload da nota fiscal');
    }
}

/**
 * Delete a receipt image (Not implemented in backend yet, just placeholder)
 * @param url - The public URL of the image to delete
 */
export async function deleteReceipt(url: string): Promise<void> {
    console.warn('Delete receipt not implemented in backend yet');
    return Promise.resolve();
}
