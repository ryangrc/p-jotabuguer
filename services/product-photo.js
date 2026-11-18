// Uses the existing imageUrl data-image support; no separate upload or local-only storage.
let photoRevision = 0;
let photoBusy = false;
function productPhotoBusy() { return photoBusy; }
function resetProductPhoto() {
  photoRevision++; photoBusy = false;
  const input = document.getElementById('productPhotoFile');
  input.value = '';
  document.getElementById('productPhotoStatus').textContent = '';
  const url = document.getElementById('productImageUrl').value;
  const preview = document.getElementById('productPhotoPreview');
  preview.hidden = !url;
  if (url) preview.src = url; else preview.removeAttribute('src');
  document.getElementById('removeProductPhoto').hidden = !url;
}
function productPhotoMarkup(product) {
  const url = String(product.imageUrl || '');
  if (!/^(https:\/\/|data:image\/(jpeg|png|webp);base64,)/i.test(url)) return '';
  return `<img class="product-photo-image" src="${escapeHtml(url)}" alt="${escapeHtml(product.menuName || product.name)}" loading="lazy" />`;
}
async function prepareProductPhoto(file) {
  if (!file) return;
  const revision = ++photoRevision;
  const status = document.getElementById('productPhotoStatus');
  photoBusy = true; status.textContent = 'Preparando a foto…';
  try {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw Error('Escolha uma foto JPG, PNG ou WebP. Para HEIC, exporte a foto como JPG.');
    if (file.size > 15 * 1024 * 1024) throw Error('A foto deve ter até 15 MB. Escolha uma versão menor.');
    const source = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(Error('N�o foi poss�vel ler o arquivo.'));
      reader.readAsDataURL(file);
    });
    const image = new Image(); image.src = source;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw Error('Não foi possível ler esta foto. Escolha outro arquivo.');
    const canvas = document.createElement('canvas');
    let result = '';
    // Keep below the existing 200,000-character per-field server limit.
    for (const size of [960, 720, 512, 360]) {
      const scale = Math.min(1, size / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      result = canvas.toDataURL('image/jpeg', .76);
      if (result.length <= 120000) break;
    }
    if (result.length > 120000) throw Error('Não foi possível reduzir esta foto. Escolha outra imagem.');
    if (revision !== photoRevision) return;
    document.getElementById('productImageUrl').value = result;
    resetProductPhoto();
    status.textContent = 'Foto pronta. Clique em Salvar produto para confirmar a alteração.';
  } catch (error) {
    if (revision === photoRevision) status.textContent = error.message || 'Não foi possível abrir a foto. Tente outro arquivo.';
  } finally {
    if (revision === photoRevision) photoBusy = false;
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('productPhotoFile');
  const drop = document.getElementById('productPhotoDrop');
  input.addEventListener('change', () => prepareProductPhoto(input.files[0]));
  for (const name of ['dragenter', 'dragover']) drop.addEventListener(name, event => {
    event.preventDefault(); drop.classList.add('drag-over');
  });
  for (const name of ['dragleave', 'drop']) drop.addEventListener(name, event => {
    event.preventDefault(); drop.classList.remove('drag-over');
  });
  drop.addEventListener('drop', event => {
    if (event.dataTransfer.files.length !== 1) {
      document.getElementById('productPhotoStatus').textContent = 'Escolha uma foto por produto.'; return;
    }
    prepareProductPhoto(event.dataTransfer.files[0]);
  });
  document.getElementById('removeProductPhoto').addEventListener('click', () => {
    document.getElementById('productImageUrl').value = ''; resetProductPhoto();
    document.getElementById('productPhotoStatus').textContent = 'Foto removida da prévia. Salve o produto para confirmar.';
  });
});
