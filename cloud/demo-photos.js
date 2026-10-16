// Bundled photo catalog for the fictitious bakery. Paths resolve under /encomenda/.
export const DEMO_PHOTO_CATALOG = [
  { name: 'Brigadeiro (cento)', description: 'Brigadeiros gourmet em sabores variados.', category: 'Docinhos', priceFromCents: 17000, slug: 'brigadeiros-gourmet', featured: true },
  { name: 'Bolo de pistache', description: 'Massa macia com recheio cremoso de pistache.', category: 'Bolos', priceFromCents: 18000, slug: 'bolo-pistache', featured: true },
  { name: 'Bolo de chocolate com morango', description: 'Chocolate intenso com morangos frescos.', category: 'Bolos', priceFromCents: 22000, slug: 'bolo-chocolate-morango' },
  { name: 'Bento cake', description: 'Bolo pequeno decorado para presentear.', category: 'Bolos', priceFromCents: 4500, slug: 'bento-cake' },
  { name: 'Docinhos sortidos', description: 'Caixa com docinhos artesanais variados.', category: 'Docinhos', priceFromCents: 12000, slug: 'caixa-docinhos' },
  { name: 'Kit festa', description: 'Bolo decorado acompanhado de docinhos.', category: 'Kits', priceFromCents: 26000, slug: 'kit-festa', featured: true },
  { name: 'Bolo infantil', description: 'Bolo decorado para uma comemoração especial.', category: 'Bolos', priceFromCents: 24000, slug: 'bolo-infantil' },
  { name: 'Naked cake de morango', description: 'Camadas de bolo com creme e frutas frescas.', category: 'Bolos', priceFromCents: 25000, slug: 'bolo-aniversario-frutas' },
  { name: 'Brownies', description: 'Brownies úmidos com casquinha crocante.', category: 'Docinhos', priceFromCents: 9000, slug: 'brownies' },
  { name: 'Sobremesas individuais', description: 'Porções individuais para servir geladas.', category: 'Sobremesas', priceFromCents: 8000, slug: 'sobremesas-individuais' },
  { name: 'Cupcakes', description: 'Cupcakes decorados, feitos para compartilhar.', category: 'Docinhos', priceFromCents: 6500, slug: 'cupcakes' },
  { name: 'Bolo de cenoura', description: 'Bolo de cenoura com cobertura de chocolate.', category: 'Bolos', priceFromCents: 9000, slug: 'bolo-cenoura-chocolate' },
].map(({ slug, ...product }) => ({ ...product, photo: `exemplo/${slug}-960.webp` }));

export const DEMO_COVER_PHOTO = 'exemplo/bastidores-confeitaria-960.webp';

// Only these historical demo orders may use a related catalog name. Checking both
// identifiers prevents a real order, or an edited demo order, from inheriting a photo.
const DEMO_ORDER_ALIASES = new Map([
  ['DEMO-04|Bolo de cenoura', 'Bolo de cenoura'],
  ['DEMO-H5|Bolo de cenoura', 'Bolo de cenoura'],
  ['DEMO-05|Bolo de pote (10 un.)', 'Bolo de pote'],
  ['DEMO-H3|Bolo de pote (10 un.)', 'Bolo de pote'],
  ['DEMO-09|Docinhos sortidos (50 un.)', 'Docinhos sortidos'],
  ['DEMO-11|Kit festa (bolo + 50 doces)', 'Kit festa'],
]);

export function demoOrderPhoto(order, products, isDemo) {
  if (!order || !Array.isArray(products)) return '';
  const exact = products.find((product) => product?.photo && String(product.name).toLocaleLowerCase('pt-BR') === String(order.product || '').toLocaleLowerCase('pt-BR'));
  if (exact) return exact.photo;
  if (isDemo !== true) return '';
  const targetName = DEMO_ORDER_ALIASES.get(`${order.id}|${order.product}`);
  if (!targetName) return '';
  return products.find((product) => product?.name === targetName && product.photo)?.photo || '';
}
