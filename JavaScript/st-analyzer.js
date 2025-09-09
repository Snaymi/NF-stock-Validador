const stAnalyzer = (function () {
    let resutadoProcessado = []; // Guarda os resultados

    function parseValorMonetario(str) {
        if (!str) return NaN;
        return parseFloat(
            str.replace(/\./g, '').replace(',', '.')
        );
    }

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
                const vBCSTTotal = xmlDoc.querySelector("total > ICMSTot > vBCST");

                // 🔹 Normaliza o valor em número
                let valorST = 0;
                if (vBCSTTotal) {
                    valorST = parseFloat(
                        vBCSTTotal.textContent.replace(/\./g, '').replace(',', '.')
                    ) || 0;
                }

                // 🔹 Se for diferente de zero, descarta
                if (valorST !== 0) {
                    console.warn(`❌ Nota descartada (${nNF ? nNF.textContent : "sem número"}) - vBCST = ${valorST}`);
                    resolve(null); // retorna null para indicar que foi descartada
                    return;
                }

                // 🔹 Só chega aqui quem passou no filtro (vBCST = 0)
                const resultado = {
                    nomeArquivo: file.name,
                    numeroNota: nNF ? nNF.textContent.trim() : "Não encontrado",
                    valorBCST: "0,00"
                };

                console.log("✅ Nota aceita:", resultado.numeroNota);
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
    //Inicialização
    const init = function () {
        const inputMultipleFiles = document.getElementById('file-input3');
        const btnMultipleFiles = document.getElementById('btn-arquivo3');
        if (!inputMultipleFiles) {
            console.error("❌ Input não encontrado!");
            return;
        }
        if (!btnMultipleFiles) {
            console.error("❌ Botão não encontrado!");
            return;
        }

        btnMultipleFiles.addEventListener('click', function (event) {
            inputMultipleFiles.click();
        }); // <-- chama inputMultipleFiles.click());

        inputMultipleFiles.addEventListener('change', (event) => {
            const files = event.target.files;
            console.log('Arquivos selecionados:', files);
            if (files.length > 0) {
                const promessas = [];
                for (const file of files) {
                    promessas.push(lerArquivoXML(file));
                }

                Promise.all(promessas).then(resultados => {
                    // 🔹 Só pega os válidos (não nulos)
                    const validos = resultados.filter(r => r !== null);

                    // 🔹 Armazena em global para cruzar depois com Excel
                    window.nfesSemST = validos.map(item => item.numeroNota);

                    console.log("📄 NFEs aceitas (vBCST = 0):", window.nfesSemST);

                    // 🚀 Se já tem Excel carregado, aplica filtro automático
                    if (linhasOriginaisExcel.length > 0) {
                        filtrarTabelaPorNotasST();
                        alert(`✅ Filtro final aplicado automaticamente! 
Foram mantidas apenas as notas com vBCST = 0.
Total aceitas: ${window.nfesSemST.length}`);
                    } else {
                        alert("⚠️ NF-es com vBCST = 0 registradas. Carregue um Excel para aplicar o filtro final.");
                    }
                });
            }
        });
    };

    return { init }; // <-- expõe init para fora
})(); // <-- executa a IIFE imediatamente

// Chama init quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function () {
    stAnalyzer.init();
});