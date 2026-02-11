import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { Rota, Motorista } from '../types';

export interface SpreadsheetRow {
    route_number: string;       // Coluna K
    payment_date: string;       // Coluna O
    gross_value: number;        // Coluna P
    raw_data: any;
}

export interface ClosureData {
    route_number: string;
    payment_date: string;
    total_gross_value: number;  // Sum of gross_value for this route_number
    items: SpreadsheetRow[];
}

export interface RouteImportData {
    plate: string;          // PLACA
    driver_name: string;    // MOTORISTA
    route_number: string;   // VIAGEM
    date: string;           // DATA (YYYY-MM-DD)
    initial_km: number;     // KM INICIO
    final_km: number;       // KM FINAL
    total_km: number;       // TOTAL
    city: string;           // CIDADE
    pernoite_count: number; // PERNOITE
    unloading_value: number; // DESCARGA (R$)
}

export const spreadsheetService = {
    // Parse Excel file
    parseFile: async (file: File): Promise<ClosureData[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });

                    // Assume data is in the first sheet
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];

                    // Convert to JSON
                    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 'A' });

                    // Process and group by route number
                    const processedData = processSpreadsheetData(jsonData);
                    resolve(processedData);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    },

    // Parse Excel file for Bulk Route Import
    parseRoutes: async (file: File): Promise<RouteImportData[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];

                    // Parse as Array of Arrays to be robust against header location
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
                    console.log('Raw Excel Data Sample:', jsonData.slice(0, 3));

                    // Find Header Row (look for "PLACA" in any column)
                    let headerRowIndex = -1;
                    for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
                        const row = jsonData[i];
                        if (row && row.some(cell => String(cell).toUpperCase().trim() === 'PLACA')) {
                            headerRowIndex = i;
                            break;
                        }
                    }

                    if (headerRowIndex === -1) {
                        console.warn('Header "PLACA" not found. Defaulting to row 0.');
                        headerRowIndex = 0;
                    }

                    const headers = jsonData[headerRowIndex].map(h => String(h).toUpperCase().trim());
                    console.log('Found Headers:', headers);

                    // Helper to get index by header name
                    const getIdx = (name: string) => headers.indexOf(name);

                    const colIdx = {
                        PLACA: getIdx('PLACA'),
                        MOTORISTA: getIdx('MOTORISTA'),
                        VIAGEM: getIdx('VIAGEM'),
                        DATA: getIdx('DATA'),
                        KM_INICIO: getIdx('KM INICIO'),
                        KM_FINAL: getIdx('KM FINAL'),
                        TOTAL: getIdx('TOTAL'),
                        CIDADE: getIdx('CIDADE'),
                        PERNOITE: getIdx('PERNOITE'),
                        DESCARGA: getIdx('DESCARGA')
                    };

                    // Process rows after header
                    const processedRoutes = jsonData.slice(headerRowIndex + 1).map((row: any[]) => {
                        const getVal = (idx: number) => (idx !== -1 && row[idx] !== undefined) ? row[idx] : '';

                        // Parse Date (DD/MMM format often comes as string in Portuguese Excel)
                        let dateStr = getVal(colIdx.DATA);
                        let formattedDate = new Date().toISOString().split('T')[0];

                        if (typeof dateStr === 'number') {
                            // Excel serial date
                            const date = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
                            formattedDate = date.toISOString().split('T')[0];
                        } else if (typeof dateStr === 'string' && dateStr.includes('/')) {
                            const parts = dateStr.trim().split('/');
                            if (parts.length >= 2) {
                                const day = parts[0].padStart(2, '0');
                                const monthStr = parts[1].toLowerCase().substring(0, 3);

                                const months: { [key: string]: string } = {
                                    'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04', 'mai': '05', 'jun': '06',
                                    'jul': '07', 'ago': '08', 'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
                                };
                                const month = months[monthStr] || '01';
                                const year = new Date().getFullYear(); // Assume current year for day/month inputs
                                formattedDate = `${year}-${month}-${day}`;
                            }
                        }

                        // Parse Currency (R$ 140,00)
                        const parseCurrency = (val: any) => {
                            if (typeof val === 'number') return val;
                            if (typeof val === 'string') {
                                return parseFloat(val.replace(/[^\d,-]/g, '').replace(',', '.') || '0');
                            }
                            return 0;
                        };

                        return {
                            plate: String(getVal(colIdx.PLACA)).trim().toUpperCase(),
                            driver_name: String(getVal(colIdx.MOTORISTA)).trim().toUpperCase(),
                            route_number: String(getVal(colIdx.VIAGEM)).trim(),
                            date: formattedDate,
                            initial_km: parseFloat(getVal(colIdx.KM_INICIO)) || 0,
                            final_km: parseFloat(getVal(colIdx.KM_FINAL)) || 0,
                            total_km: parseFloat(getVal(colIdx.TOTAL)) || 0,
                            city: String(getVal(colIdx.CIDADE)).trim(),
                            pernoite_count: parseFloat(getVal(colIdx.PERNOITE)) || 0,
                            unloading_value: parseCurrency(getVal(colIdx.DESCARGA))
                        } as RouteImportData;
                    }).filter(r => r.plate && r.route_number); // Filter empty rows

                    resolve(processedRoutes);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    },

    // Save closure data to Supabase
    saveClosure: async (closureData: ClosureData[], routes: Rota[]) => {
        // This will be implemented to save to the new tables
        console.log('Saving closure data:', closureData);
    }
};

// Helper to process raw JSON from Excel
function processSpreadsheetData(data: any[]): ClosureData[] {
    const closuresMap = new Map<string, ClosureData>();

    // Skip header rows if necessary (usually first row is header in A1 notation, but we used header: 'A')
    // Adjust based on the actual Excel structure.
    // Coluna D -> Route Identifier (index 3 or 'D') - used for matching
    // Coluna K -> Route Number (might be auxiliary now)
    // Coluna O -> Payment Date (index 14 or 'O')
    // Coluna P -> Gross Value (index 15 or 'P')

    for (let i = 1; i < data.length; i++) {
        const row = data[i];

        // Check if row has valid data for Route Identifier (Column D)
        if (!row['D']) continue;

        const routeIdentifier = String(row['D']).trim();

        // Extract payment date (Column O)
        let paymentDate = row['O'];
        if (typeof paymentDate === 'number') {
            // Excel serial date conversion (avoiding timezone offset)
            const date = new Date(Math.round((paymentDate - 25569) * 86400 * 1000));
            const year = date.getUTCFullYear();
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date.getUTCDate()).padStart(2, '0');
            paymentDate = `${year}-${month}-${day}`;
        } else if (typeof paymentDate === 'string') {
            // If it's already a string, ensure it's in a usable format or keep as is
            // Some XLSX parsers might already return strings if formatted
        }

        // Extract gross value (Column P)
        let grossValue = 0;
        if (typeof row['P'] === 'number') {
            grossValue = row['P'];
        } else if (typeof row['P'] === 'string') {
            grossValue = parseFloat(row['P'].replace(',', '.') || '0');
        }

        if (!closuresMap.has(routeIdentifier)) {
            closuresMap.set(routeIdentifier, {
                route_number: routeIdentifier, // Using Identifier from D as the key
                payment_date: String(paymentDate || ''),
                total_gross_value: 0,
                items: []
            });
        }

        const closure = closuresMap.get(routeIdentifier)!;
        closure.total_gross_value += grossValue || 0;

        closure.items.push({
            route_number: routeIdentifier,
            payment_date: String(paymentDate || ''),
            gross_value: grossValue || 0,
            raw_data: row
        });
    }

    return Array.from(closuresMap.values());
}
