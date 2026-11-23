#!/usr/bin/env python3
"""Gera dados simulados de aparência realista (determinísticos) no formato de scenario.json.
Tudo é inventado: nomes, e-mails em domínio reservado (.test), sem CNPJ, sem credenciais."""
import json, random, datetime as dt, pathlib

R = random.Random(536)
B = 1000000
iso = lambda d: d.strftime("%Y-%m-%dT00:00:00.000Z")
D = lambda s: dt.date.fromisoformat(s)

nomes = ["Ana Beatriz Moreira","Carlos Eduardo Lima","Fernanda Rocha","João Pedro Almeida","Luciana Barros",
 "Marcos Vinícius Teles","Patrícia Nogueira","Rafael Duarte","Simone Castilho","Thiago Albuquerque",
 "Vanessa Prado","Eduardo Sampaio","Helena Frota","Ricardo Menezes","Débora Siqueira"]
usuarios = [
 {"id":B+1,"nome":"Mariana Teixeira Coutinho","email":"mariana.coutinho@observatorio.test","perfil":"administrador","ativo":True},
 {"id":B+2,"nome":"Paulo Henrique Vasconcelos","email":"paulo.vasconcelos@observatorio.test","perfil":"gestor","ativo":True},
 {"id":B+3,"nome":"Camila Ferraz","email":"camila.ferraz@observatorio.test","perfil":"estagiario","ativo":True},
 {"id":B+4,"nome":"Roberto Salgado","email":"roberto.salgado@observatorio.test","perfil":"visualizador","ativo":True},
]
tipos = [("Hotel","hotel"),("Pousada","pousada"),("Resort","hotel"),("Hostel","hostel"),("Chalés","pousada")]
sobren = ["Bela Vista","Recanto do Sol","Mirante da Serra","Porto Seguro das Águas","Vale Verde","Brisa do Lago",
 "Jardim das Acácias","Pedra Azul","Villa Serena","Ipê Amarelo","Cachoeira Dourada","Canto do Sabiá"]
emp, segs, ue, contatos, cad, inv, invitens = [], [], [], [], [], [], []
for i, sn in enumerate(sobren):
    t, cat = tipos[i % len(tipos)]
    eid = B + 1 + i
    ativo = i != 10
    e = {"id":eid,"nomeFantasia":f"{t} {sn}","idOrigem":f"simulado:{i+1:03d}","tipoHospedagem":t.lower().replace("é","e").replace("ê","e") if t!="Chalés" else "chale",
         "categoriaIndicador":cat,"situacao":"ativo" if ativo else "encerrado"}
    if not ativo: e["dataEncerramento"]="2026-08-31T00:00:00.000Z"
    emp.append(e)
    segs.append({"empreendimentoId":eid,"segmentoId":B+1})
    slug = sn.lower().replace(" ","-").replace("ç","c").replace("ã","a").replace("é","e").replace("í","i").replace("á","a")
    contatos.append({"id":B+1+i,"empreendimentoId":eid,"tipo":"email","valor":f"reservas@{slug}.test","finalidade":"publico"})
    cad.append({"id":B+1+i,"empreendimentoId":eid,"situacao":R.choice(["nao_possui","nao_possui","possui"]) if False else "nao_possui"})
    uh = R.randint(8,60); lei = uh*R.choice([2,2,3,4])
    for j,(ini,fim) in enumerate([("2026-01-01","2026-07-31"),("2026-08-01",None)]):
        v = {"id":B+1+i*2+j,"empreendimentoId":eid,"criadaPor":B+2,"vigenciaInicio":iso(D(ini)),
             "tipoAlteracao":"mudanca_real","situacaoConferencia":"completo",
             "totalUh":uh+(0 if j==0 else R.choice([0,0,2,4])),"leitos":lei+(0 if j==0 else R.choice([0,0,4,8])),
             "maxLeitosPorUh":R.choice([2,3,4]),"funcFixos":max(2,uh//3),"funcTemporarios":R.choice([0,0,2,4])}
        if fim: v["vigenciaFim"]=iso(D(fim))
        inv.append(v)
        for k in range(1,5):
            invitens.append({"versaoId":v["id"],"itemId":B+k,"estado":R.choice(["sim","sim","sim","nao","nao_informado"])})
    if ativo:
        o = nomes[i % len(nomes)]
        uid = B + 5 + i
        usuarios.append({"id":uid,"nome":o,"email":f"{o.lower().split()[0]}.{slug.split('-')[0]}@{slug}.test".replace("ã","a").replace("é","e").replace("í","i").replace("ç","c"),"perfil":"empresario","ativo":True})
        ue.append({"usuarioId":uid,"empreendimentoId":eid,"ativo":True})

itens = [("pix","Pix"),("credito","Cartão de crédito"),("debito","Cartão de débito"),("dinheiro","Dinheiro")]
grupos = [{"id":B+1,"segmentoId":B+1,"chave":"hospedagem.pagamento","pergunta":"Quais formas de pagamento são aceitas?","selecao":"multipla","permiteOutro":True,"ordem":1}]
citens = [{"id":B+1+k,"grupoId":B+1,"chave":f"pagamento.{c}","rotulo":r,"exclusivo":False,"ordem":k+1,"ativo":True} for k,(c,r) in enumerate(itens)]

meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro"]
periodos = []
for m in range(10):
    ini = dt.date(2026,m+1,1); fim = (dt.date(2026,m+2,1) if m<11 else dt.date(2027,1,1)) - dt.timedelta(days=1)
    periodos.append({"id":B+1+m,"tipo":"mes","rotulo":f"{meses[m]} 2026","dataInicio":iso(ini),"dataFim":iso(fim)})

campos = [{"id":B+1,"modeloId":B+1,"chave":"ocupacao","rotulo":"Taxa de ocupação (%)","tipoValor":"percentual","obrigatorio":True,"ordem":1},
          {"id":B+2,"modeloId":B+1,"chave":"observacao","rotulo":"Observações","tipoValor":"texto","obrigatorio":False,"ordem":2}]
pesq, perg, resp, ritens = [], [], [], []
ativos = [e for e in emp if e["situacao"]=="ativo"]
rid = 0
for m in range(9):  # Jan–Set encerradas
    p = periodos[m]; pid = B+1+m
    fim = D(p["dataFim"][:10])
    pesq.append({"id":pid,"modeloId":B+1,"titulo":f"Ocupação — {p['rotulo']}","tipoColeta":"consolidado",
                 "abertura":iso(fim+dt.timedelta(days=1)),"prazo":(fim+dt.timedelta(days=11)).isoformat()+"T23:59:59.000Z","status":"encerrada"})
    perg.append({"id":pid,"pesquisaId":pid,"campoId":B+1,"periodoId":pid,"rotulo":"Ocupação do período (%)"})
    for e in ativos:
        if R.random() < 0.85:
            rid += 1
            u = next(x for x in ue if x["empreendimentoId"]==e["id"])
            dia = fim + dt.timedelta(days=R.randint(2,9))
            resp.append({"id":B+rid,"pesquisaId":pid,"empreendimentoId":e["id"],"usuarioId":u["usuarioId"],
                         "respondidaEm":f"{dia.isoformat()}T{R.randint(9,18):02d}:{R.randint(0,59):02d}:00.000Z","canal":R.choice(["sistema","sistema","email"])})
            alta = m in (0,1,6,11)
            ritens.append({"respostaId":B+rid,"perguntaId":pid,"valorNumerico":f"{R.randint(55,90) if alta else R.randint(30,72)}"})

coletas, cid = [], 0
for e in ativos:
    for m in range(5,10):
        base = R.randint(140,520)
        for d in R.sample(range(1,28),4):
            cid += 1; dia = dt.date(2026,m+1,d); fds = dia.weekday()>=4
            coletas.append({"id":B+cid,"empreendimentoId":e["id"],"periodoId":B+1+m,"fonte":R.choice(["booking","empresario"]),
                "dataColeta":iso(dia-dt.timedelta(days=R.randint(1,10))),"dataEstadia":iso(dia),
                "tipoDia":"fim_de_semana" if fds else "semana","valorDiaria":f"{base*(1.25 if fds else 1)+R.randint(-15,15):.2f}"})

out = {"metadata":{"name":"oto-simulado-producao","version":1,"synthetic":True,"referenceDate":"2026-11-22T12:00:00.000Z","methodologyApprovedByOto":False},
 "usuarios":usuarios,"segmentos":[{"id":B+1,"chave":"hospedagem","nome":"Meios de hospedagem","nivelCadastro":"completo"}],
 "empreendimentos":emp,"empreendimentoSegmentos":segs,"usuarioEmpreendimentos":ue,"contatos":contatos,"cadastur":cad,
 "catalogoGrupos":grupos,"catalogoItens":citens,"inventarios":inv,"inventarioItens":invitens,"periodos":periodos,
 "pesquisaModelos":[{"id":B+1,"nome":"Consolidado mensal de ocupação","publicoAlvo":"empreendimento"}],
 "pesquisaCampos":campos,"pesquisas":pesq,"perguntas":perg,"respostas":resp,"respostaItens":ritens,"coletasDiarias":coletas}
p = pathlib.Path(__file__).with_name("dados.json")
p.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n")
print({k:len(v) for k,v in out.items() if isinstance(v,list)})
