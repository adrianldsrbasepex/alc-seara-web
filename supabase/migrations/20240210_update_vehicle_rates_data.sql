-- Update vehicle rates based on new data table

-- Super Médio Group (R$ 650.10 / R$ 2.14)
UPDATE vehicles SET model = 'Super Médio', daily_rate = 650.10, km_rate = 2.14 WHERE plate IN ('SEZ-8J71', 'FRI-3B21', 'SWQ-7I71', 'SJK-5E70', 'SJR-8D34');

-- Super Médio (<5 Anos) Group (R$ 593.94 / R$ 1.63)
UPDATE vehicles SET model = 'Super Médio (<5 Anos)', daily_rate = 593.94, km_rate = 1.63 WHERE plate = 'RIP-1E18';

-- Médio frigorifico Group (R$ 609.63 / R$ 1.53)
UPDATE vehicles SET model = 'Médio frigorifico', daily_rate = 609.63, km_rate = 1.53 WHERE plate = 'RIU-1I98';

-- Vuc frigorifico (<5 Anos) Group (R$ 580.64 / R$ 1.53)
UPDATE vehicles SET model = 'Vuc frigorifico (<5 Anos)', daily_rate = 580.64, km_rate = 1.53 WHERE plate IN ('TKE-4A57', 'TJD-3B96', 'TKR-0D94', 'TLN-9A77', 'TMH-8B95');
