import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { ProtocolItem } from '../types/database';

export async function exportProtocolToExcel(items: ProtocolItem[], protocolTitle?: string, protocolId?: string | number) {
  try {
    // 1. Fetch the template file
    const response = await fetch('/templates/modelo_cotacao.xlsx');
    if (!response.ok) {
      throw new Error('Não foi possível carregar o modelo de cotação. Verifique se o arquivo existe em public/templates/modelo_cotacao.xlsx');
    }
    const arrayBuffer = await response.arrayBuffer();

    // 2. Load it with ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // 3. Get the target worksheet
    // Tenta pegar a aba pelo nome exato, se falhar, pega a primeira
    let worksheet = workbook.getWorksheet('ENVIAR PARA FORNECEDOR');
    if (!worksheet) {
      worksheet = workbook.worksheets[0];
    }

    if (!worksheet) {
      throw new Error('Aba não encontrada no template de Excel.');
    }

    // 4. Populate rows starting from row 10
    const startRow = 10;
    
    items.forEach((item, index) => {
      const rowIndex = startRow + index;
      const row = worksheet!.getRow(rowIndex);

      // Extrair medidas no formato A x B x C
      const measurements = Object.values(item.measurements || {})
        .filter(Boolean)
        .join('X');

      // Coluna A: Item (Número)
      row.getCell(1).value = index + 1;
      
      // Coluna B: Código/Referência
      row.getCell(2).value = item.code || item.oem || '';
      
      // Coluna C: Descrição
      row.getCell(3).value = item.name || '';
      
      // Coluna D: Medidas
      row.getCell(4).value = measurements;
      
      // Coluna E: Quantidade
      row.getCell(5).value = item.quantity;
      
      row.commit();
    });

    // 5. Save and trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const fileName = protocolTitle ? `Cotacao_${protocolTitle.replace(/[^a-z0-9]/gi, '_')}.xlsx` : `Cotacao_Protocolo_${protocolId || 'Novo'}.xlsx`;
    
    saveAs(blob, fileName);
    return { success: true };
  } catch (error) {
    console.error('Erro ao exportar excel:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}
