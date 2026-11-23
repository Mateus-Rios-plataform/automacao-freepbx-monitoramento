# Como contribuir

Obrigado pelo interesse! Este projeto é pequeno e quer continuar simples. Contribuições de código, documentação e relatos de teste em outras versões do FreePBX são muito bem-vindas.

## Regra de ouro do projeto

**A automação só lê e avisa.** Nenhuma mudança pode fazer o monitor alterar uma central (reiniciar serviços, mexer em firewall, senhas, ramais...). Os testes em `fluxos/testes/avaliar.test.js` verificam isso; um pull request que os enfraqueça não será aceito.

## Antes de começar

1. Procure nas [issues](https://github.com/Mateus-Rios-plataform/automacao-freepbx-monitoramento/issues) se já existe o assunto.
2. Para mudanças grandes (novo canal de alerta, nova regra), **abra uma issue primeiro** para combinarmos a direção.
3. **Nunca** inclua em issues, commits ou pull requests: IPs reais, nomes de clientes, chaves, senhas, IDs de grupo de WhatsApp, a sua `centrais.csv`. Use endereços de documentação (`192.0.2.x`, `198.51.100.x`, `203.0.113.x`).

## Preparando o ambiente

Só é preciso **Node.js 18+** (sem dependências) e `bash`.

```bash
git clone https://github.com/Mateus-Rios-plataform/automacao-freepbx-monitoramento.git
cd automacao-freepbx-monitoramento
node fluxos/testes/avaliar.test.js     # deve terminar com "0 falharam"
bash -n monitor/instalar.sh central/*.sh   # checagem de sintaxe dos scripts
```

## Estilo

- Textos para o usuário final em **português do Brasil**, em linguagem simples.
- Documentação: cada comando traz **o que faz** e **como saber que deu certo**. Palavras técnicas novas entram no [glossário](docs/glossario.md).
- Scripts: `bash` com `set -euo pipefail`, idempotentes (seguros de repetir) e com mensagens claras de erro.
- `fluxos/avaliar.js` não pode usar `require`, `fetch`, `eval`, `child_process` nem `$helpers` (há teste para isso).
- Mudou uma regra de alerta? **Escreva ou ajuste um teste.**

## Pull requests

1. Faça um *fork* e crie uma branch (`git checkout -b minha-mudanca`).
2. Faça commits pequenos, com mensagens no formato [Conventional Commits](https://www.conventionalcommits.org/pt-br/) (por exemplo, `fix: ...`, `feat: ...`, `docs: ...`).
3. Rode os testes e a checagem de sintaxe.
4. Atualize a documentação e o [CHANGELOG](CHANGELOG.md).
5. Abra o pull request preenchendo o modelo.

## Relatando testes em outras versões

Testou com outra versão de FreePBX/Asterisk (ou em outro Linux)? Abra uma issue com a versão e o resultado. Isso ajuda a atualizar a seção "Limitações" do README.

## Segurança

Falhas de segurança **não** vão em issue pública: veja [SECURITY.md](SECURITY.md).

## Código de Conduta

Ao participar, você concorda em seguir o [Código de Conduta](CODE_OF_CONDUCT.md). Ao contribuir, você concorda que o seu trabalho será licenciado sob a [licença MIT](LICENSE).
