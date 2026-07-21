import AppKit

let canvasWidth = 1284
let canvasHeight = 2778
let outDir = URL(fileURLWithPath: "/Users/joaquimcardeira/Documents/monitriip/store-assets/apple")

struct Field {
    let label: String
    let value: String
}

struct Metric {
    let value: String
    let label: String
}

struct Event {
    let title: String
    let detail: String
    let time: String
}

enum Body {
    case setup
    case tracking
    case boarding
    case occurrence
    case export
}

struct Screen {
    let file: String
    let headline: String
    let subhead: String
    let status: String
    let live: Bool
    let body: Body
}

let screens = [
    Screen(
        file: "01-preparacao-viagem.png",
        headline: "Prepare uma viagem regular em minutos",
        subhead: "Dados do motorista, veiculo, linha e ordem de servico ficam prontos antes do rastreamento.",
        status: "rascunho",
        live: false,
        body: .setup
    ),
    Screen(
        file: "02-gps-segundo-plano.png",
        headline: "GPS em segundo plano durante todo o trajeto",
        subhead: "Amostras de posicao continuam sendo registradas enquanto a viagem esta ativa.",
        status: "rastreando",
        live: true,
        body: .tracking
    ),
    Screen(
        file: "03-embarque-passageiro.png",
        headline: "Registre o embarque na porta do onibus",
        subhead: "Assento e documento ficam vinculados a viagem ativa para envio ou exportacao.",
        status: "rastreando",
        live: true,
        body: .boarding
    ),
    Screen(
        file: "04-registro-ocorrencia.png",
        headline: "Registre ocorrencias durante a operacao",
        subhead: "Fiscalizacoes, atrasos, desvios e atendimento a passageiros sem interromper o GPS.",
        status: "rastreando",
        live: true,
        body: .occurrence
    ),
    Screen(
        file: "05-sincronizacao-exportacao.png",
        headline: "Sincronize online, exporte quando precisar",
        subhead: "O aparelho mantem uma fila local para preservar evidencias mesmo com sinal fraco.",
        status: "finalizada",
        live: false,
        body: .export
    )
]

func color(_ hex: UInt32) -> NSColor {
    let r = CGFloat((hex >> 16) & 0xff) / 255
    let g = CGFloat((hex >> 8) & 0xff) / 255
    let b = CGFloat(hex & 0xff) / 255
    return NSColor(calibratedRed: r, green: g, blue: b, alpha: 1)
}

let teal = color(0x0f766e)
let ink = color(0x0f172a)
let bodyText = color(0x334155)
let muted = color(0x64748b)
let border = color(0xdbe4eb)
let lightPanel = color(0xffffff)
let pageBackground = color(0xf1f8f6)
let red = color(0xb91c1c)

func attrs(size: CGFloat, weight: NSFont.Weight, textColor: NSColor, mono: Bool = false) -> [NSAttributedString.Key: Any] {
    let font = mono
        ? NSFont.monospacedSystemFont(ofSize: size, weight: weight)
        : NSFont.systemFont(ofSize: size, weight: weight)
    let paragraph = NSMutableParagraphStyle()
    paragraph.lineBreakMode = .byWordWrapping
    paragraph.lineSpacing = size * 0.1
    return [
        .font: font,
        .foregroundColor: textColor,
        .paragraphStyle: paragraph
    ]
}

func drawText(_ text: String, rect: CGRect, size: CGFloat, weight: NSFont.Weight, textColor: NSColor, mono: Bool = false) {
    NSString(string: text).draw(with: rect, options: [.usesLineFragmentOrigin, .usesFontLeading], attributes: attrs(size: size, weight: weight, textColor: textColor, mono: mono))
}

func fillRound(_ rect: CGRect, radius: CGFloat, color fill: NSColor) {
    fill.setFill()
    NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius).fill()
}

func strokeRound(_ rect: CGRect, radius: CGFloat, color stroke: NSColor, width: CGFloat) {
    stroke.setStroke()
    let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
    path.lineWidth = width
    path.stroke()
}

func drawButton(_ text: String, x: CGFloat, y: CGFloat, width: CGFloat, fill: NSColor, textColor: NSColor = ink) {
    let rect = CGRect(x: x, y: y, width: width, height: 78)
    fillRound(rect, radius: 18, color: fill)
    drawText(text, rect: rect.insetBy(dx: 18, dy: 19), size: 28, weight: .bold, textColor: textColor)
}

func drawPanel(_ rect: CGRect, dark: Bool = false) {
    fillRound(rect, radius: 22, color: dark ? ink : lightPanel)
    if !dark {
        strokeRound(rect, radius: 22, color: border, width: 2)
    }
}

func drawField(_ field: Field, x: CGFloat, y: CGFloat, width: CGFloat) {
    drawText(field.label.uppercased(), rect: CGRect(x: x, y: y, width: width, height: 28), size: 20, weight: .bold, textColor: muted)
    let valueRect = CGRect(x: x, y: y + 36, width: width, height: 76)
    fillRound(valueRect, radius: 18, color: lightPanel)
    strokeRound(valueRect, radius: 18, color: color(0xcbd5e1), width: 2)
    drawText(field.value, rect: valueRect.insetBy(dx: 18, dy: 20), size: 30, weight: .semibold, textColor: ink)
}

func drawAppHeader(status: String, live: Bool, y: CGFloat) {
    drawText("OPERACAO ANTT MONITRIIP", rect: CGRect(x: 150, y: y, width: 640, height: 32), size: 24, weight: .bold, textColor: teal)
    drawText("Console do Motorista", rect: CGRect(x: 150, y: y + 36, width: 680, height: 65), size: 50, weight: .black, textColor: ink)
    let pill = CGRect(x: 910, y: y + 4, width: 200, height: 62)
    fillRound(pill, radius: 18, color: live ? color(0xdcfce7) : color(0xe2e8f0))
    drawText(status.uppercased(), rect: pill.insetBy(dx: 13, dy: 17), size: 21, weight: .black, textColor: ink)
}

func drawDarkSummary(y: CGFloat, gps: String, sync: String?, actions: [(String, NSColor, CGFloat, NSColor)]) {
    let rect = CGRect(x: 150, y: y, width: 984, height: 250)
    drawPanel(rect, dark: true)
    drawText("RIO DE JANEIRO para SAO PAULO", rect: CGRect(x: 184, y: y + 28, width: 880, height: 54), size: 38, weight: .black, textColor: .white)
    if let sync {
        drawText(sync, rect: CGRect(x: 184, y: y + 92, width: 840, height: 38), size: 26, weight: .regular, textColor: color(0xcbd5e1))
        drawText(gps, rect: CGRect(x: 184, y: y + 134, width: 840, height: 38), size: 26, weight: .regular, textColor: color(0xcbd5e1))
    } else {
        drawText("Permissoes: localizacao sempre autorizada", rect: CGRect(x: 184, y: y + 92, width: 840, height: 38), size: 26, weight: .regular, textColor: color(0xcbd5e1))
        drawText(gps, rect: CGRect(x: 184, y: y + 134, width: 840, height: 38), size: 26, weight: .regular, textColor: color(0xcbd5e1))
    }
    var currentX: CGFloat = 184
    for (label, fill, width, textColor) in actions {
        drawButton(label, x: currentX, y: y + 176, width: width, fill: fill, textColor: textColor)
        currentX += width + 14
    }
}

func drawEvents(_ events: [Event], y: CGFloat) {
    let rect = CGRect(x: 150, y: y, width: 984, height: 500)
    drawPanel(rect)
    drawText("Evidencias da viagem", rect: CGRect(x: 184, y: y + 28, width: 760, height: 48), size: 34, weight: .black, textColor: ink)
    var currentY = y + 104
    for event in events {
        color(0xe2e8f0).setStroke()
        let line = NSBezierPath()
        line.move(to: CGPoint(x: 184, y: currentY))
        line.line(to: CGPoint(x: 1098, y: currentY))
        line.lineWidth = 2
        line.stroke()
        drawText(event.title, rect: CGRect(x: 184, y: currentY + 22, width: 860, height: 38), size: 31, weight: .black, textColor: ink)
        drawText(event.detail, rect: CGRect(x: 184, y: currentY + 68, width: 860, height: 70), size: 26, weight: .regular, textColor: bodyText)
        drawText(event.time, rect: CGRect(x: 184, y: currentY + 138, width: 860, height: 32), size: 22, weight: .regular, textColor: muted)
        currentY += 182
    }
}

func drawSetup() {
    let rect = CGRect(x: 150, y: 1030, width: 984, height: 645)
    drawPanel(rect)
    drawText("Preparacao da viagem", rect: CGRect(x: 184, y: 1058, width: 760, height: 48), size: 34, weight: .black, textColor: ink)
    let fields = [
        Field(label: "CPF do motorista", value: "12345678901"),
        Field(label: "Placa do veiculo", value: "BUS7A21"),
        Field(label: "Ordem de servico", value: "OS-2026-0714"),
        Field(label: "Codigo da linha", value: "RJ-SP-430"),
        Field(label: "Origem", value: "RIO DE JANEIRO"),
        Field(label: "Destino", value: "SAO PAULO")
    ]
    for index in 0..<fields.count {
        let col = index % 2
        let row = index / 2
        drawField(fields[index], x: 184 + CGFloat(col) * 462, y: 1130 + CGFloat(row) * 158, width: 430)
    }
    drawDarkSummary(y: 1700, gps: "GPS na fila: 0 pontos", sync: nil, actions: [("Iniciar viagem", teal, 250, .white), ("Sincronizar", color(0xe2e8f0), 220, ink)])
}

func drawTracking() {
    drawDarkSummary(y: 1010, gps: "GPS na fila: 248 pontos", sync: "Viagem iniciada: 14 jul 2026, 08:35", actions: [("Encerrar viagem", red, 280, .white), ("Sincronizar", color(0xe2e8f0), 220, ink)])
    let rect = CGRect(x: 150, y: 1288, width: 984, height: 770)
    drawPanel(rect)
    drawText("Evidencia de rota em tempo real", rect: CGRect(x: 184, y: 1316, width: 850, height: 48), size: 33, weight: .black, textColor: ink)
    let map = CGRect(x: 184, y: 1388, width: 916, height: 470)
    fillRound(map, radius: 24, color: color(0xecfdf5))
    teal.withAlphaComponent(0.2).setStroke()
    for x in stride(from: map.minX + 40, through: map.maxX, by: 126) {
        let line = NSBezierPath()
        line.move(to: CGPoint(x: x, y: map.minY))
        line.line(to: CGPoint(x: x, y: map.maxY))
        line.lineWidth = 2
        line.stroke()
    }
    for y in stride(from: map.minY + 40, through: map.maxY, by: 126) {
        let line = NSBezierPath()
        line.move(to: CGPoint(x: map.minX, y: y))
        line.line(to: CGPoint(x: map.maxX, y: y))
        line.lineWidth = 2
        line.stroke()
    }
    teal.setStroke()
    let route = NSBezierPath()
    route.lineWidth = 13
    route.lineCapStyle = .round
    route.move(to: CGPoint(x: 300, y: 1705))
    route.curve(to: CGPoint(x: 920, y: 1495), controlPoint1: CGPoint(x: 520, y: 1590), controlPoint2: CGPoint(x: 720, y: 1620))
    route.stroke()
    for point in [CGPoint(x: 300, y: 1705), CGPoint(x: 920, y: 1495)] {
        fillRound(CGRect(x: point.x - 19, y: point.y - 19, width: 38, height: 38), radius: 19, color: red)
        strokeRound(CGRect(x: point.x - 19, y: point.y - 19, width: 38, height: 38), radius: 19, color: .white, width: 8)
    }
    let metrics = [Metric(value: "15s", label: "Intervalo"), Metric(value: "50m", label: "Distancia"), Metric(value: "Alta", label: "Precisao")]
    for index in 0..<metrics.count {
        let m = metrics[index]
        let box = CGRect(x: 184 + CGFloat(index) * 310, y: 1885, width: 290, height: 120)
        fillRound(box, radius: 20, color: color(0xf1f5f9))
        drawText(m.value, rect: CGRect(x: box.minX + 24, y: box.minY + 20, width: 240, height: 45), size: 36, weight: .black, textColor: ink)
        drawText(m.label, rect: CGRect(x: box.minX + 24, y: box.minY + 72, width: 240, height: 32), size: 22, weight: .bold, textColor: muted)
    }
}

func drawBoarding() {
    let panel = CGRect(x: 150, y: 1030, width: 984, height: 315)
    drawPanel(panel)
    drawText("Embarcar passageiro", rect: CGRect(x: 184, y: 1058, width: 700, height: 48), size: 34, weight: .black, textColor: ink)
    drawField(Field(label: "Documento", value: "MG1234567"), x: 184, y: 1130, width: 560)
    drawField(Field(label: "Assento", value: "18"), x: 770, y: 1130, width: 200)
    drawButton("Registrar embarque", x: 184, y: 1250, width: 310, fill: teal, textColor: .white)
    drawEvents([
        Event(title: "Assento 18", detail: "Documento do passageiro MG1234567", time: "14 jul 2026, 09:18"),
        Event(title: "Assento 06", detail: "Documento do passageiro RJ9876543", time: "14 jul 2026, 08:58")
    ], y: 1372)
}

func drawOccurrence() {
    let panel = CGRect(x: 150, y: 1030, width: 984, height: 390)
    drawPanel(panel)
    drawText("Ocorrencia", rect: CGRect(x: 184, y: 1058, width: 700, height: 48), size: 34, weight: .black, textColor: ink)
    let valueRect = CGRect(x: 184, y: 1130, width: 916, height: 150)
    fillRound(valueRect, radius: 18, color: lightPanel)
    strokeRound(valueRect, radius: 18, color: color(0xcbd5e1), width: 2)
    drawText("Fiscalizacao rodoviaria concluida no posto BR-116 KM 184. Viagem seguiu sem atraso.", rect: valueRect.insetBy(dx: 18, dy: 18), size: 28, weight: .regular, textColor: ink)
    drawButton("Registrar ocorrencia", x: 184, y: 1310, width: 330, fill: color(0xe2e8f0))
    drawEvents([
        Event(title: "Ocorrencia operacional", detail: "Fiscalizacao concluida no posto BR-116 KM 184.", time: "14 jul 2026, 11:42"),
        Event(title: "Assento 18", detail: "Documento do passageiro MG1234567", time: "14 jul 2026, 09:18")
    ], y: 1448)
}

func drawExport() {
    drawDarkSummary(y: 1030, gps: "GPS na fila: 0 pontos", sync: "Ultima sincronizacao: 16:22 - enviados 248", actions: [("Sincronizar", color(0xe2e8f0), 230, ink)])
    let panel = CGRect(x: 150, y: 1310, width: 984, height: 620)
    drawPanel(panel)
    drawText("Pacote de exportacao", rect: CGRect(x: 184, y: 1338, width: 760, height: 48), size: 34, weight: .black, textColor: ink)
    let codeRect = CGRect(x: 184, y: 1414, width: 916, height: 460)
    fillRound(codeRect, radius: 20, color: color(0xf1f5f9))
    let code = """
{
  "trip": "trip-20260714-rjsp",
  "placaVeiculo": "BUS7A21",
  "ordemServico": "OS-2026-0714",
  "gpsPendente": 0,
  "eventos": [
    "embarque",
    "ocorrencia"
  ],
  "status": "finalizada"
}
"""
    drawText(code, rect: codeRect.insetBy(dx: 24, dy: 24), size: 22, weight: .regular, textColor: bodyText, mono: true)
}

func render(_ screen: Screen) throws {
    let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: canvasWidth,
        pixelsHigh: canvasHeight,
        bitsPerSample: 8,
        samplesPerPixel: 3,
        hasAlpha: false,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    )!

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)

    pageBackground.setFill()
    CGRect(x: 0, y: 0, width: canvasWidth, height: canvasHeight).fill()

    color(0xeaf3f1).setFill()
    NSBezierPath(ovalIn: CGRect(x: -210, y: -170, width: 900, height: 900)).fill()
    color(0xdff4ed).setFill()
    NSBezierPath(ovalIn: CGRect(x: 760, y: 200, width: 700, height: 700)).fill()

    drawText("Monitriip Driver", rect: CGRect(x: 80, y: 110, width: 850, height: 54), size: 40, weight: .bold, textColor: teal)
    drawText(screen.headline, rect: CGRect(x: 80, y: 190, width: 1040, height: 230), size: 88, weight: .black, textColor: color(0x07111f))
    drawText(screen.subhead, rect: CGRect(x: 80, y: 438, width: 980, height: 120), size: 37, weight: .regular, textColor: bodyText)

    let phone = CGRect(x: 120, y: 720, width: 1044, height: 1840)
    fillRound(phone, radius: 70, color: color(0xf8fafc))
    strokeRound(phone, radius: 70, color: ink, width: 7)
    fillRound(CGRect(x: 512, y: 744, width: 260, height: 38), radius: 24, color: ink)

    drawAppHeader(status: screen.status, live: screen.live, y: 820)

    switch screen.body {
    case .setup:
        drawSetup()
    case .tracking:
        drawTracking()
    case .boarding:
        drawBoarding()
    case .occurrence:
        drawOccurrence()
    case .export:
        drawExport()
    }

    drawText("App iOS nativo para evidencias da viagem ativa e envio de GPS em segundo plano", rect: CGRect(x: 80, y: 2698, width: 1124, height: 40), size: 22, weight: .bold, textColor: muted)

    NSGraphicsContext.restoreGraphicsState()

    let png = bitmap.representation(using: .png, properties: [:])!
    try png.write(to: outDir.appendingPathComponent(screen.file))
}

for screen in screens {
    try render(screen)
    print(screen.file)
}
