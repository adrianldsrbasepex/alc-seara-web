const fs = require('fs');
const path = require('path');

const FFFD = '\uFFFD';

// Context-based rules: each [broken, fixed] pair where broken is what appears in source
// The strategy: replace pattern-based occurrences
const exactFixes = [
    // Common Portuguese words with broken chars
    ['Gest\uFFFDo', 'Gestão'],
    ['gest\uFFFDo', 'gestão'],
    ['Usu\uFFFDrios', 'Usuários'],
    ['usu\uFFFDrios', 'usuários'],
    ['Usu\uFFFDrio', 'Usuário'],
    ['usu\uFFFDrio', 'usuário'],
    ['Hist\uFFFDrico', 'Histórico'],
    ['hist\uFFFDrico', 'histórico'],
    ['Per\uFFFDodo', 'Período'],
    ['per\uFFFDodo', 'período'],
    ['Vis\uFFFDo', 'Visão'],
    ['vis\uFFFDo', 'visão'],
    ['Di\uFFFDria', 'Diária'],
    ['di\uFFFDria', 'diária'],
    ['Di\uFFFDrias', 'Diárias'],
    ['di\uFFFDrias', 'diárias'],
    ['Di\uFFFDrio', 'Diário'],
    ['dia\uFFFDrias', 'diárias'],
    ['Avaria\uFFFDs', 'Avarias'],
    ['Opera\uFFFDes', 'Operações'],
    ['opera\uFFFDes', 'operações'],
    ['Informa\uFFFD\uFFFDes', 'Informações'],
    ['informa\uFFFD\uFFFDes', 'informações'],
    ['Aten\uFFFD\uFFFDo', 'Atenção'],
    ['aten\uFFFD\uFFFDo', 'atenção'],
    ['solu\uFFFD\uFFFDo', 'solução'],
    ['Solu\uFFFD\uFFFDo', 'Solução'],
    ['a\uFFFD\uFFFDo', 'ação'],
    ['A\uFFFD\uFFFDo', 'Ação'],
    ['cria\uFFFD\uFFFDo', 'criação'],
    ['Cria\uFFFD\uFFFDo', 'Criação'],
    ['aplica\uFFFD\uFFFDo', 'aplicação'],
    ['Aplica\uFFFD\uFFFDo', 'Aplicação'],
    ['registro\uFFFD', 'registros'],
    ['Configura\uFFFD\uFFFDo', 'Configuração'],
    ['configura\uFFFD\uFFFDo', 'configuração'],
    ['\uFFFDo Geral', 'ão Geral'],
    ['Fun\uFFFD\uFFFDo', 'Função'],
    ['fun\uFFFD\uFFFDo', 'função'],
    ['Sess\uFFFDo', 'Sessão'],
    ['sess\uFFFDo', 'sessão'],
    ['vers\uFFFDo', 'versão'],
    ['Vers\uFFFDo', 'Versão'],
    ['valida\uFFFD\uFFFDo', 'validação'],
    ['Valida\uFFFD\uFFFDo', 'Validação'],
    ['Motorista N\uFFFDo', 'Motorista Não'],
    ['n\uFFFDo ', 'não '],
    ['N\uFFFDo ', 'Não '],
    ['n\uFFFDo\n', 'não\n'],
    ['N\uFFFDo\n', 'Não\n'],
    ['Encerramento\uFFFD', 'Encerramentos'],
    ['\uFFFDltimo', 'último'],
    ['\uFFFDltima', 'última'],
    ['c\uFFFDdigo', 'código'],
    ['C\uFFFDdigo', 'Código'],
    ['n\uFFFDmero', 'número'],
    ['N\uFFFDmero', 'Número'],
    ['m\uFFFDs', 'mês'],
    ['M\uFFFDs', 'Mês'],
    ['m\uFFFDdio', 'médio'],
    ['M\uFFFDdio', 'Médio'],
    ['ser\uFFFD', 'será'],
    ['Ser\uFFFD', 'Será'],
    ['descri\uFFFD\uFFFDo', 'descrição'],
    ['Descri\uFFFD\uFFFDo', 'Descrição'],
    ['fun\uFFFDes', 'funções'],
    ['Fun\uFFFDes', 'Funções'],
    ['Gest\uFFFDo', 'Gestão'],
    ['exclu\uFFFDdo', 'excluído'],
    ['conclus\uFFFDo', 'conclusão'],
    ['ocorr\uFFFDncia', 'ocorrência'],
    ['Ocorr\uFFFDncia', 'Ocorrência'],
    ['pr\uFFFDximo', 'próximo'],
    ['Pr\uFFFDximo', 'Próximo'],
    ['carga\uFFFD', 'cargas'],
    ['veiculada\uFFFDs', 'veiculadas'],
    ['m\uFFFDximo', 'máximo'],
    ['M\uFFFDximo', 'Máximo'],
    ['m\uFFFDnimo', 'mínimo'],
    ['M\uFFFDnimo', 'Mínimo'],
    ['Encerrado\uFFFD', 'Encerrados'],
    ['fechamento\uFFFD', 'fechamentos'],
    ['Pagamento\uFFFD', 'Pagamentos'],
    ['Pgto Avulso', 'Pagamento Avulso'],
    ['Data Pgto (Edit)', 'Data Pagamento'],
    ['sucess\uFFFD', 'sucesso'],
    ['erro\uFFFD', 'erros'],
    ['Erro\uFFFD', 'Erros'],
    ['rota\uFFFD', 'rotas'],
    ['Rota\uFFFDs', 'Rotas'],
    ['Finaliza\uFFFD\uFFFDo', 'Finalização'],
    ['finaliza\uFFFD\uFFFDo', 'finalização'],
    ['cen\uFFFDrio', 'cenário'],
    ['Cen\uFFFDrio', 'Cenário'],
    ['necess\uFFFDrio', 'necessário'],
    ['Necess\uFFFDrio', 'Necessário'],
    ['O campo \uFFFD', 'O campo é'],
    [' \uFFFD obrigat\uFFFDrio', ' é obrigatório'],
    [' \uFFFD ', ' é '],
    ['j\uFFFD ', 'já '],
    ['J\uFFFD ', 'Já '],
    ['tamb\uFFFDm', 'também'],
    ['Tamb\uFFFDm', 'Também'],
    ['crit\uFFFDrio', 'critério'],
    ['Crit\uFFFDrio', 'Critério'],
    ['erros de portugu\uFFFDs', 'erros de português'],
    ['obrigat\uFFFDrio', 'obrigatório'],
    ['Obrigat\uFFFDrio', 'Obrigatório'],
    ['rela\uFFFD\uFFFDo', 'relação'],
    ['Rela\uFFFD\uFFFDo', 'Relação'],
    ['atualiza\uFFFD\uFFFDo', 'atualização'],
    ['Atualiza\uFFFD\uFFFDo', 'Atualização'],
    ['exibi\uFFFD\uFFFDo', 'exibição'],
    ['Exibi\uFFFD\uFFFDo', 'Exibição'],
    ['opera\uFFFD\uFFFDo', 'operação'],
    ['Opera\uFFFD\uFFFDo', 'Operação'],
    ['INTERA\uFFFD\uFFFDO', 'INTERAÇÃO'],
];

const files = [
    'c:/Users/adria/Desktop/ALC - SEARA/components/AdminPanel.tsx',
    'c:/Users/adria/Desktop/ALC - SEARA/components/ManagerialDashboard.tsx',
    'c:/Users/adria/Desktop/ALC - SEARA/components/ClosureTable.tsx',
    'c:/Users/adria/Desktop/ALC - SEARA/components/UnloadingReimbursement.tsx',
    'c:/Users/adria/Desktop/ALC - SEARA/components/DriverPanel.tsx',
    'c:/Users/adria/Desktop/ALC - SEARA/App.tsx',
];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let text = fs.readFileSync(file, 'utf8');
    let originalText = text;
    let count = 0;

    for (const [broken, fixed] of exactFixes) {
        while (text.includes(broken)) {
            text = text.replace(broken, fixed);
            count++;
        }
    }

    // If there are still replacement chars, show context for manual fixing
    const remaining = (text.match(/\uFFFD/g) || []).length;

    if (text !== originalText) {
        fs.writeFileSync(file, text, 'utf8');
        console.log(`Fixed ${count} issues in ${path.basename(file)} (${remaining} remaining broken chars)`);
    } else {
        console.log(`No changes needed in ${path.basename(file)} (${remaining} broken chars)`);
    }
}
