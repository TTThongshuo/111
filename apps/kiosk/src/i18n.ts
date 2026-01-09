export const Languages = ["zh-CN", "zh-TW", "ja-JP", "ko-KR", "en-US"] as const;
export type Language = (typeof Languages)[number];

type Key =
  | "booting"
  | "bootHint"
  | "welcome"
  | "deviceId"
  | "locationOnly"
  | "startPhoto"
  | "chooseGender"
  | "male"
  | "female"
  | "group"
  | "chooseStyle"
  | "chooseTemplate"
  | "templatesFilteredByLocation"
  | "takePhoto"
  | "selectedTemplate"
  | "useThisPhoto"
  | "yesGenerate"
  | "no"
  | "back"
  | "generating"
  | "jobStatus"
  | "payTitle"
  | "payQr"
  | "payHint"
  | "orderStatus"
  | "resultPreview"
  | "saveHint"
  | "openDownload"
  | "printing"
  | "printingHint";

const dict: Record<Language, Record<Key, string>> = {
  "zh-CN": {
    booting: "设备启动中…",
    bootHint: "正在连接本地服务并加载模板。",
    welcome: "欢迎使用 AI 冰箱贴拍照",
    deviceId: "设备",
    locationOnly: "本机限定点位",
    startPhoto: "开始拍照",
    chooseGender: "请选择性别",
    male: "男",
    female: "女",
    group: "合照",
    chooseStyle: "请选择风格",
    chooseTemplate: "请选择模板",
    templatesFilteredByLocation: "模板已按点位限定过滤（例如天安门/动物园互不串用）。",
    takePhoto: "拍照",
    selectedTemplate: "当前模板",
    useThisPhoto: "是否使用此照片生成？",
    yesGenerate: "是，开始生成",
    no: "否，重新拍照",
    back: "返回",
    generating: "AI 生成中，请稍候…",
    jobStatus: "状态",
    payTitle: "扫码付款，保存到手机及打印冰箱贴",
    payQr: "支付二维码",
    payHint: "请使用微信/支付宝扫码完成支付（此版本为模拟支付）。",
    orderStatus: "订单状态",
    resultPreview: "生成预览",
    saveHint: "支付成功后可保存到手机：",
    openDownload: "打开保存页",
    printing: "正在打印…",
    printingHint: "打印完成后请取走冰箱贴。"
  },
  "zh-TW": {
    booting: "設備啟動中…",
    bootHint: "正在連線本地服務並載入模板。",
    welcome: "歡迎使用 AI 冰箱貼拍照",
    deviceId: "設備",
    locationOnly: "本機限定點位",
    startPhoto: "開始拍照",
    chooseGender: "請選擇性別",
    male: "男",
    female: "女",
    group: "合照",
    chooseStyle: "請選擇風格",
    chooseTemplate: "請選擇模板",
    templatesFilteredByLocation: "模板已依點位限定過濾。",
    takePhoto: "拍照",
    selectedTemplate: "目前模板",
    useThisPhoto: "是否使用此照片生成？",
    yesGenerate: "是，開始生成",
    no: "否，重新拍照",
    back: "返回",
    generating: "AI 生成中，請稍候…",
    jobStatus: "狀態",
    payTitle: "掃碼付款，保存到手機及列印冰箱貼",
    payQr: "支付二維碼",
    payHint: "請使用微信/支付寶掃碼完成支付（此版本為模擬支付）。",
    orderStatus: "訂單狀態",
    resultPreview: "生成預覽",
    saveHint: "支付成功後可保存到手機：",
    openDownload: "打開保存頁",
    printing: "正在列印…",
    printingHint: "列印完成後請取走冰箱貼。"
  },
  "ja-JP": {
    booting: "起動中…",
    bootHint: "ローカルサービスに接続してテンプレートを読み込みます。",
    welcome: "AI 冷蔵庫マグネット撮影へようこそ",
    deviceId: "デバイス",
    locationOnly: "設置場所限定",
    startPhoto: "撮影開始",
    chooseGender: "性別を選択",
    male: "男性",
    female: "女性",
    group: "集合",
    chooseStyle: "スタイルを選択",
    chooseTemplate: "テンプレートを選択",
    templatesFilteredByLocation: "テンプレートは設置場所により制限されています。",
    takePhoto: "撮影",
    selectedTemplate: "選択テンプレート",
    useThisPhoto: "この写真で生成しますか？",
    yesGenerate: "はい、生成開始",
    no: "いいえ、撮り直す",
    back: "戻る",
    generating: "生成中…",
    jobStatus: "状態",
    payTitle: "支払いQRをスキャンして保存＆印刷",
    payQr: "支払いQR",
    payHint: "WeChat/Alipayで支払い（この版はモック）。",
    orderStatus: "注文状態",
    resultPreview: "プレビュー",
    saveHint: "支払い後に保存：",
    openDownload: "保存ページを開く",
    printing: "印刷中…",
    printingHint: "印刷完了後にお受け取りください。"
  },
  "ko-KR": {
    booting: "부팅 중…",
    bootHint: "로컬 서비스에 연결하고 템플릿을 불러옵니다.",
    welcome: "AI 냉장고 자석 촬영에 오신 것을 환영합니다",
    deviceId: "장치",
    locationOnly: "장소 한정",
    startPhoto: "촬영 시작",
    chooseGender: "성별 선택",
    male: "남",
    female: "여",
    group: "단체",
    chooseStyle: "스타일 선택",
    chooseTemplate: "템플릿 선택",
    templatesFilteredByLocation: "템플릿은 장소 정책으로 제한됩니다.",
    takePhoto: "촬영",
    selectedTemplate: "선택 템플릿",
    useThisPhoto: "이 사진으로 생성할까요?",
    yesGenerate: "예, 생성",
    no: "아니요, 다시 촬영",
    back: "뒤로",
    generating: "생성 중…",
    jobStatus: "상태",
    payTitle: "결제 QR을 스캔하여 저장 및 인쇄",
    payQr: "결제 QR",
    payHint: "WeChat/Alipay 결제(현재는 모의 결제).",
    orderStatus: "주문 상태",
    resultPreview: "미리보기",
    saveHint: "결제 후 저장:",
    openDownload: "저장 페이지 열기",
    printing: "인쇄 중…",
    printingHint: "인쇄 완료 후 가져가세요."
  },
  "en-US": {
    booting: "Booting…",
    bootHint: "Connecting to local server and loading templates.",
    welcome: "Welcome to AI Photo Magnet",
    deviceId: "Device",
    locationOnly: "Location-limited",
    startPhoto: "Start",
    chooseGender: "Choose gender",
    male: "Male",
    female: "Female",
    group: "Group",
    chooseStyle: "Choose style",
    chooseTemplate: "Choose template",
    templatesFilteredByLocation: "Templates are filtered by location policy.",
    takePhoto: "Take photo",
    selectedTemplate: "Template",
    useThisPhoto: "Use this photo to generate?",
    yesGenerate: "Yes, generate",
    no: "No, retake",
    back: "Back",
    generating: "Generating…",
    jobStatus: "Status",
    payTitle: "Scan to pay, save to phone and print",
    payQr: "Payment QR",
    payHint: "Scan with WeChat/Alipay (mock in this demo).",
    orderStatus: "Order status",
    resultPreview: "Preview",
    saveHint: "After payment you can save:",
    openDownload: "Open download page",
    printing: "Printing…",
    printingHint: "Please pick up after printing."
  }
};

export function t(lang: Language, key: Key): string {
  return dict[lang]?.[key] ?? dict["zh-CN"][key] ?? key;
}

