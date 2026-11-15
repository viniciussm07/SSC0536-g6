# Hooks compartilhados

Coloque aqui hooks reutilizados por mais de uma página ou componente, em arquivos
`use-<nome>.ts`. Hooks específicos de uma página ficam em `pages/<pagina>/hooks.ts`.
Não mova um hook para esta pasta apenas por ele usar React Query. Não crie abstrações
antes de existir reutilização concreta.
