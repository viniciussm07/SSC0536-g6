import { Type, Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  PERFIS,
  RECURSOS_ACESSO,
  ACOES_ACESSO,
  ESCOPOS_ACESSO,
  PAGINATION,
  type Perfil,
  type RecursoAcesso,
  type AcaoAcesso,
  type EscopoAcesso,
} from '@ssc0536/common';

export class PaginaDto {
  @Type(() => Number) @IsInt() @Min(1) page = PAGINATION.firstPage;
  @Type(() => Number) @IsInt() @Min(1) @Max(PAGINATION.maxPageSize) pageSize =
    PAGINATION.defaultPageSize;
}
export class CriarContaDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 200)
  nome!: string;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
  @IsIn(PERFIS) perfil!: Perfil;
}
export class AlterarContaDto {
  @IsIn(PERFIS) perfil!: Perfil;
  @IsBoolean() ativo!: boolean;
}
export class AlterarVinculoDto {
  @IsBoolean() ativo!: boolean;
}
export class PermissaoDto {
  @IsIn(RECURSOS_ACESSO) recurso!: RecursoAcesso;
  @IsIn(ACOES_ACESSO) acao!: AcaoAcesso;
  @IsIn(ESCOPOS_ACESSO) escopo!: EscopoAcesso;
}
export class AlterarPermissoesDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PermissaoDto)
  permissoes!: PermissaoDto[];
}
export class AlterarVisibilidadeDto {
  @IsBoolean() permitido!: boolean;
}
export function paginacao(query: PaginaDto) {
  return { skip: (query.page - 1) * query.pageSize, take: query.pageSize };
}
export function colecao<T>(data: T[], total: number, query: PaginaDto) {
  return {
    data,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}
