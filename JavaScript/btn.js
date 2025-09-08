document.addEventListener('exibirTabelaFiltrada', function() {
  const botao = document.getElementById('btn-filtrar-ncm');
  botao.style.display = 'block';
});

const dropdown = document.getElementById('dropdown');
dropdown.addEventListener('click', () => {
  dropdown.classList.toggle('open');
})