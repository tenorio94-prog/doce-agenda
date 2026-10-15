// Ajustes comuns da Web Awesome no Doce Agenda.
// O ícone padrão da Web Awesome busca desenhos no site do Font Awesome; aqui ele é trocado
// por uma biblioteca vazia, para nunca chamar outro site. Use library="system" (já embutida).
import { registerIconLibrary } from '@awesome.me/webawesome/dist/components/icon/library.js';
import '@awesome.me/webawesome/dist/translations/pt.js';

registerIconLibrary('default', {
  resolver: () => 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E',
});
