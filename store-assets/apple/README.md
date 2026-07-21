# Capturas Para a App Store

A Apple aceita de 1 a 10 capturas por tamanho de dispositivo em `.png`, `.jpg` ou `.jpeg`. As imagens não podem ter canal alfa.

Use apenas os arquivos da pasta `upload/` no App Store Connect.

Capturas finais:

- iPhone: `1284 x 2778`
- iPad: `2064 x 2752`

O App Store Connect pode redimensionar essas imagens para iPhones menores quando você não enviar capturas específicas para cada classe de dispositivo.

Arquivo fonte:

- `generate-upload-screenshots.js`

Arquivos para upload:

- `upload/iphone-01-viagem-ativa.png`
- `upload/iphone-02-evidencias.png`
- `upload/ipad-01-viagem-ativa.png`
- `upload/ipad-02-evidencias.png`

Para regerar:

```sh
node store-assets/apple/generate-upload-screenshots.js
```
