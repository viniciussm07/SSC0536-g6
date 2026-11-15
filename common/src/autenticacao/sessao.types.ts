export interface IdentidadeSessao {
  id: number;
  nome: string;
  email: string;
  perfil: string;
}
export interface SessaoAtual {
  usuario: IdentidadeSessao;
  expiraEm: string;
}
export interface EntradaLogin {
  email: string;
  senha: string;
}
export interface EntradaAtivacao {
  token: string;
  senha: string;
}
