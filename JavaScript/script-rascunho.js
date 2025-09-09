const stAnalyzer = (function () {
    
    // [1] Estado interno - onde vamos guardar os resultados
    let resultadosProcessados = [];
    
    // [2] Função para ler um arquivo XML
    function lerArquivoXML(file) {
        return new Promise(function (resolve, reject) {
            const reader = new FileReader();
            
            reader.onload = function (e) {
                const xmlString = e.target.result;
                
                // Parse do XML string para DOM
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlString, "text/xml");
                
                // Verifica se houve erro no parse
                const parseError = xmlDoc.querySelector("parsererror");
                if (parseError) {
                    console.error("❌ Erro ao fazer parse do XML:", file.name);
                    reject(new Error("XML inválido"));
                    return;
                }
                
                // Extrai os campos desejados
                const nNF = xmlDoc.querySelector("nNF");
                const vBCST = xmlDoc.querySelector("vBCST");
                
                const resultado = {
                    nomeArquivo: file.name,
                    numeroNota: nNF ? nNF.textContent : "Não encontrado",
                    valorBCST: vBCST ? vBCST.textContent : "Não encontrado"
                };
                
                console.log("✅ Arquivo processado: " + file.name);
                console.log("   📄 Número da Nota: " + resultado.numeroNota);
                console.log("   💰 Valor BCST: " + resultado.valorBCST);
                
                resolve(resultado);
            };
            
            reader.onerror = function () {
                console.error("❌ Erro ao ler arquivo: " + file.name);
                reject(new Error("Erro na leitura do arquivo"));
            };
            
            // Inicia a leitura do arquivo como texto
            reader.readAsText(file);
        });
    }
    
    // [3] Função para processar múltiplos arquivos
    async function processarArquivos(files) {
        console.log("📂 Iniciando processamento de " + files.length + " arquivo(s)...");
        
        // Limpa resultados anteriores
        resultadosProcessados = [];
        
        // Processa cada arquivo
        for (const file of files) {
            try {
                const resultado = await lerArquivoXML(file);
                resultadosProcessados.push(resultado);
            } catch (error) {
                console.error("⚠️ Arquivo " + file.name + " pulado devido a erro");
            }
        }
        
        console.log("📊 Processamento completo!");
        console.log("Resultados:", resultadosProcessados);
    }
    
    // [4] Inicialização
    function init() {
        const inputMultipleFiles = document.getElementById('file-input3');
        if (!inputMultipleFiles) {
            console.error("❌ Input não encontrado!");
            return;
        }
        
        inputMultipleFiles.addEventListener('change', function (event) {
            const files = event.target.files;
            if (files.length > 0) {
                processarArquivos(files);
            }
        });
        
        console.log("✅ STAnalyzer inicializado e pronto!");
    }

    // Expõe somente o init
    return { init: init };

})();

// Chama init quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function () {
    stAnalyzer.init();
});