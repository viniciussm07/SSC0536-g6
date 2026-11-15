import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';
import { SENHA_LIMITES } from '@ssc0536/common';
export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @Length(1, SENHA_LIMITES.maximo)
  senha!: string;
}
export class AtivacaoDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  token!: string;

  @IsString()
  @Length(SENHA_LIMITES.minimo, SENHA_LIMITES.maximo)
  senha!: string;
}
