"use strict";
/* 定数・辞書・部屋の系譜データ */
const API="https://www.sumo-api.com/api";
const DIVS=[["Makuuchi","幕内"],["Juryo","十両"],["Makushita","幕下"],["Sandanme","三段目"],["Jonidan","序二段"],["Jonokuchi","序ノ口"]];
const DIVJP=Object.fromEntries(DIVS);
const BASHO_NAME={"01":"初場所","03":"春場所","05":"夏場所","07":"名古屋場所","09":"秋場所","11":"九州場所"};
const RANK={Yokozuna:["横綱","横",1],Ozeki:["大関","大",2],Sekiwake:["関脇","関",3],Komusubi:["小結","小",4],Maegashira:["前頭","前",5],Juryo:["十両","十",6],Makushita:["幕下","幕",7],Sandanme:["三段目","三",8],Jonidan:["序二段","二",9],Jonokuchi:["序ノ口","口",10]};
const HEYA={Ajigawa:"安治川",Arashio:"荒汐",Asahiyama:"朝日山",Asakayama:"浅香山",Dewanoumi:"出羽海",Fujishima:"藤島",Futagoyama:"二子山",Hakkaku:"八角",Hanaregoma:"放駒",Hidenoyama:"秀ノ山",Ikazuchi:"雷",Isegahama:"伊勢ヶ濱",Isenoumi:"伊勢ノ海",Kasugano:"春日野",Kataonami:"片男波",Kise:"木瀬",Kokonoe:"九重",Minato:"湊",Minatogawa:"湊川",Musashigawa:"武蔵川",Nakamura:"中村",Naruto:"鳴戸",Nishiiwa:"西岩",Nishikido:"錦戸",Nishonoseki:"二所ノ関",Oitekaze:"追手風",Onoe:"尾上",Onomatsu:"阿武松",Oshima:"大島",Oshiogawa:"押尾川",Otake:"大嶽",Otowayama:"音羽山",Sadogatake:"佐渡ヶ嶽",Sakaigawa:"境川",Shibatayama:"芝田山",Shikihide:"式秀",Shikoroyama:"錣山",Tagonoura:"田子ノ浦",Takadagawa:"高田川",Takasago:"高砂",Takekuma:"武隈",Tamanoi:"玉ノ井",Tatsunami:"立浪",Tokitsukaze:"時津風",Yamahibiki:"山響"};
const PREF={Hokkaido:"北海道",Aomori:"青森",Iwate:"岩手",Miyagi:"宮城",Akita:"秋田",Yamagata:"山形",Fukushima:"福島",Ibaraki:"茨城",Tochigi:"栃木",Gunma:"群馬",Saitama:"埼玉",Chiba:"千葉",Tokyo:"東京",Kanagawa:"神奈川",Niigata:"新潟",Toyama:"富山",Ishikawa:"石川",Fukui:"福井",Yamanashi:"山梨",Nagano:"長野",Gifu:"岐阜",Shizuoka:"静岡",Aichi:"愛知",Mie:"三重",Shiga:"滋賀",Kyoto:"京都",Osaka:"大阪",Hyogo:"兵庫",Nara:"奈良",Wakayama:"和歌山",Tottori:"鳥取",Shimane:"島根",Okayama:"岡山",Hiroshima:"広島",Yamaguchi:"山口",Tokushima:"徳島",Kagawa:"香川",Ehime:"愛媛",Kochi:"高知",Fukuoka:"福岡",Saga:"佐賀",Nagasaki:"長崎",Kumamoto:"熊本",Oita:"大分",Miyazaki:"宮崎",Kagoshima:"鹿児島",Okinawa:"沖縄",Mongolia:"モンゴル",China:"中国",Russia:"ロシア",Ukraine:"ウクライナ",Kazakhstan:"カザフスタン",Philippines:"フィリピン",America:"アメリカ",UK:"イギリス",Georgia:"ジョージア",Brazil:"ブラジル",Egypt:"エジプト",Bulgaria:"ブルガリア",Estonia:"エストニア",Hungary:"ハンガリー",Korea:"韓国",Taiwan:"台湾",Tonga:"トンガ",Kyrgyzstan:"キルギス",Nepal:"ネパール",Indonesia:"インドネシア",Argentina:"アルゼンチン"};
const KIM={tsukidashi:"突き出し",tsukitaoshi:"突き倒し",oshidashi:"押し出し",oshitaoshi:"押し倒し",yorikiri:"寄り切り",yoritaoshi:"寄り倒し",abisetaoshi:"浴びせ倒し",uwatenage:"上手投げ",shitatenage:"下手投げ",kotenage:"小手投げ",sukuinage:"掬い投げ",uwatedashinage:"上手出し投げ",shitatedashinage:"下手出し投げ",koshinage:"腰投げ",kubinage:"首投げ",ipponzeoi:"一本背負い",nichonage:"二丁投げ",yaguranage:"櫓投げ",kakenage:"掛け投げ",tsukaminage:"つかみ投げ",sotogake:"外掛け",uchigake:"内掛け",chongake:"ちょん掛け",kirikaeshi:"切り返し",kawazugake:"河津掛け",kekaeshi:"蹴返し",ketaguri:"蹴手繰り",mitokorozeme:"三所攻め",watashikomi:"渡し込み",nimaigeri:"二枚蹴り",komatasukui:"小股掬い",sotokomata:"外小股",omata:"大股",tsumatori:"褄取り",kozumatori:"小褄取り",ashitori:"足取り",susoharai:"裾払い",susotori:"裾取り",izori:"居反り",tasukizori:"襷反り",shumokuzori:"撞木反り",sototasukizori:"外襷反り",tsutaezori:"伝え反り",kakezori:"掛け反り",tokkurinage:"徳利投げ",uchimuso:"内無双",sotomuso:"外無双",zubuneri:"頭捻り",uwatehineri:"上手捻り",shitatehineri:"下手捻り",amiuchi:"網打ち",sabaori:"鯖折り",harimanage:"波離間投げ",osakate:"大逆手",kainahineri:"腕捻り",gasshohineri:"合掌捻り",tottari:"とったり",sakatottari:"逆とったり",katasukashi:"肩透かし",hatakikomi:"叩き込み",hikiotoshi:"引き落とし",hikkake:"引っ掛け",tsukiotoshi:"突き落とし",makiotoshi:"巻き落とし",okuridashi:"送り出し",okuritaoshi:"送り倒し",okurinage:"送り投げ",okurigake:"送り掛け",okuritsuriotoshi:"送り吊り落とし",okuritsuridashi:"送り吊り出し",okurihikiotoshi:"送り引き落とし",tsuridashi:"吊り出し",tsuriotoshi:"吊り落とし",kimedashi:"極め出し",kimetaoshi:"極め倒し",utchari:"うっちゃり",waridashi:"割り出し",yobimodoshi:"呼び戻し",ushiromotare:"後ろもたれ",isamiashi:"勇み足",koshikudake:"腰砕け",tsukite:"つき手",tsukihiza:"つきひざ",fumidashi:"踏み出し",kubihineri:"首捻り",fusen:"不戦",fusensho:"不戦勝",fusenpai:"不戦敗",hansoku:"反則",sokubiotoshi:"素首落とし",dashinage:"出し投げ",kotehineri:"小手捻り",hikiwake:"引き分け",itamiwake:"痛み分け",yobikaeshi:"呼び返し"};

/* ---------- 部屋の系譜データ ---------- */
/* 部屋の系譜データ（2026-11-19 調査）
   出典: 師匠・所在地 = 日本相撲協会公式「相撲部屋のご紹介」(nsk=公式ページID)
         一門・創設年・独立元 = Wikipedia日本語版「相撲部屋」(2026-11-17更新)および各部屋の記事
   p = 独立元（部屋創設者が独立したときの所属部屋）。現存しない部屋は st:"def"
   pt = 系譜をこれ以上遡らない場合の独立元の注記 */
const ICHIMON=[
 {k:"出羽海",c:"#b23a2b"},{k:"二所ノ関",c:"#2f6db0"},{k:"時津風",c:"#2e8a57"},{k:"高砂",c:"#a0782a"},{k:"伊勢ヶ濱",c:"#7a4fa3"}
];
const HEYA_DATA=[
/* ---- 出羽海一門 ---- */
{id:"出羽海",en:"Dewanoumi",ich:"出羽海",sou:1,y:"1862",f:"3代出羽ノ海（幕下・桂川）",m:"出羽海 昭和（前頭2・小城乃花）",loc:"東京都墨田区両国",nsk:47,note:"出羽海一門の本家。長く「分家独立を許さず」の不文律があった"},
{id:"春日野",en:"Kasugano",ich:"出羽海",p:"出羽海",y:"1925",f:"8代春日野（横綱・栃木山）",m:"春日野 清隆（関脇・栃乃和歌）",loc:"東京都墨田区両国",nsk:44},
{id:"玉ノ井",en:"Tamanoi",ich:"出羽海",p:"春日野",y:"1990",f:"13代玉ノ井（関脇・栃東）",m:"玉ノ井 太祐（大関・栃東）",loc:"東京都足立区",nsk:45},
{id:"雷",en:"Ikazuchi",ich:"出羽海",p:"春日野",y:"1993",f:"16代入間川（関脇・栃司）",m:"雷 徹（小結・垣添）",loc:"東京都墨田区",nsk:10015,old:"入間川部屋（〜2023年1月）",note:"明治の「雷一門」の雷部屋とは別系統"},
{id:"三保ヶ関(旧)",ich:"出羽海",st:"def",p:"出羽海",y:"1950",close:"2013",f:"9代三保ヶ関（大関・増位山）",note:"1950年に出羽海部屋から再興。2013年閉鎖（春日野部屋へ）"},
{id:"山響",en:"Yamahibiki",ich:"出羽海",p:"三保ヶ関(旧)",y:"1985",f:"一代北の湖（横綱・北の湖）",m:"山響 謙司（前頭1・巌雄）",loc:"東京都江東区",nsk:10011,old:"北の湖部屋（〜2015年11月）"},
{id:"木瀬",en:"Kise",ich:"出羽海",p:"三保ヶ関(旧)",y:"2003",f:"11代木村瀬平（前頭1・肥後ノ海）",m:"木村 瀬平（前頭1・肥後ノ海）",loc:"東京都墨田区",nsk:57,note:"2010〜2012年に一時閉鎖処分"},
{id:"尾上",en:"Onoe",ich:"出羽海",p:"三保ヶ関(旧)",y:"2006",f:"17代尾上（小結・濱ノ嶋）",m:"尾上 圭志（小結・濱ノ嶋）",loc:"東京都大田区",nsk:10008},
{id:"藤島",en:"Fujishima",ich:"出羽海",p:"出羽海",y:"1981",f:"14代武蔵川（横綱・三重ノ海）",m:"藤島 武人（大関・武双山）",loc:"東京都荒川区",nsk:10009,old:"武蔵川部屋（〜2010年9月）",note:"出羽海部屋から62年ぶりの円満独立"},
{id:"武蔵川",en:"Musashigawa",ich:"出羽海",p:"藤島",y:"2013",f:"15代武蔵川（横綱・武蔵丸）",m:"武蔵川 光偉（横綱・武蔵丸）",loc:"東京都江戸川区",nsk:43},
{id:"二子山",en:"Futagoyama",ich:"出羽海",p:"藤島",y:"2018",f:"14代二子山（大関・雅山）",m:"二子山 雅高（大関・雅山）",loc:"東京都葛飾区",nsk:28,note:"二所ノ関一門の旧二子山部屋とは別系統"},
{id:"境川",en:"Sakaigawa",ich:"出羽海",p:"出羽海",y:"1998",f:"12代中立（小結・両国）",m:"境川 豪章（小結・両国）",loc:"東京都足立区",nsk:10003,old:"中立部屋（〜2003年1月）"},
{id:"武隈",en:"Takekuma",ich:"出羽海",p:"境川",y:"2022",f:"14代武隈（大関・豪栄道）",m:"武隈 豪太郎（大関・豪栄道）",loc:"東京都大田区",nsk:53},
{id:"立浪",en:"Tatsunami",ich:"出羽海",pt:"春日山部屋（旧）",y:"1915",f:"4代立浪（小結・緑嶌）",m:"立浪 耐治（小結・旭豊）",loc:"東京都台東区",nsk:1,note:"一門の移動：伊勢ヶ濱一門（立浪・伊勢ヶ濱連合）→貴乃花一門→無所属→2018年に出羽海一門"},
{id:"式秀",en:"Shikihide",ich:"出羽海",p:"時津風",y:"1992",f:"9代式守秀五郎（小結・大潮）",m:"式守 秀五郎（前頭9・北桜）",loc:"茨城県龍ヶ崎市",nsk:17,note:"時津風部屋から独立。2013年の師匠交代で時津風一門→出羽海一門"},
/* ---- 二所ノ関一門 ---- */
{id:"二所ノ関(旧)",ich:"二所ノ関",st:"def",close:"2013",note:"二所ノ関一門の旧本家。2013年1月に所属力士0人で閉鎖"},
{id:"佐渡ヶ嶽",en:"Sadogatake",ich:"二所ノ関",p:"二所ノ関(旧)",y:"1955",f:"11代佐渡ヶ嶽（小結・琴錦）",m:"佐渡ヶ嶽 満宗（関脇・琴ノ若）",loc:"千葉県松戸市",nsk:27},
{id:"尾車(旧)",ich:"二所ノ関",st:"def",p:"佐渡ヶ嶽",y:"1987",close:"2022",f:"8代尾車（大関・琴風）",note:"2022年2月閉鎖（押尾川部屋・二所ノ関部屋へ）"},
{id:"押尾川",en:"Oshiogawa",ich:"二所ノ関",p:"尾車(旧)",y:"2022",f:"22代押尾川（関脇・豪風）",m:"押尾川 旭（関脇・豪風）",loc:"東京都墨田区",nsk:29},
{id:"鳴戸",en:"Naruto",ich:"二所ノ関",p:"佐渡ヶ嶽",y:"2017",f:"15代鳴戸（大関・琴欧洲）",m:"鳴戸 勝紀（大関・琴欧洲）",loc:"東京都墨田区",nsk:36},
{id:"秀ノ山",en:"Hidenoyama",ich:"二所ノ関",p:"佐渡ヶ嶽",y:"2024",f:"14代秀ノ山（大関・琴奨菊）",m:"秀ノ山 和弘（大関・琴奨菊）",loc:"東京都墨田区",nsk:10017},
{id:"片男波",en:"Kataonami",ich:"二所ノ関",p:"二所ノ関(旧)",y:"1961",f:"12代片男波（関脇・玉乃海）",m:"片男波 良二（関脇・玉春日）",loc:"東京都墨田区",nsk:37},
{id:"大嶽",en:"Otake",ich:"二所ノ関",p:"二所ノ関(旧)",y:"1971",f:"一代大鵬（横綱・大鵬）",m:"大嶽 大輔（前頭9・玉飛鳥）",loc:"東京都江東区",nsk:10004,old:"大鵬部屋（〜2003年）",note:"一門の移動：二所ノ関→貴乃花一門→2018年に二所ノ関一門へ復帰"},
{id:"阿武松",en:"Onomatsu",ich:"二所ノ関",p:"大嶽",y:"1994",f:"12代阿武松（関脇・益荒雄）",m:"阿武松 健二（前頭8・大道）",loc:"千葉県習志野市",nsk:40,note:"押尾川部屋（旧）を破門同然で離れ、大鵬部屋を経て独立"},
{id:"花籠(旧)",ich:"二所ノ関",st:"def",p:"二所ノ関(旧)",y:"1952",close:"1985",f:"大ノ海（前頭・大ノ海）",note:"芝田山部屋として創設し、1953年に花籠部屋へ改称。阿佐ヶ谷勢の本家"},
{id:"放駒(旧)",ich:"二所ノ関",st:"def",p:"花籠(旧)",y:"1981",close:"2013",f:"17代放駒（大関・魁傑）",note:"2013年閉鎖（芝田山部屋へ）"},
{id:"芝田山",en:"Shibatayama",ich:"二所ノ関",p:"放駒(旧)",y:"1999",f:"12代芝田山（横綱・大乃国）",m:"芝田山 康（横綱・大乃国）",loc:"東京都杉並区",nsk:54},
{id:"二子山(旧)",ich:"二所ノ関",st:"def",p:"花籠(旧)",y:"1962",close:"1993",f:"10代二子山（横綱・初代若乃花）",note:"1993年に藤島部屋（貴ノ花）と合併し、のち貴乃花部屋へ"},
{id:"放駒",en:"Hanaregoma",ich:"二所ノ関",p:"二子山(旧)",y:"1990",f:"9代松ヶ根（大関・若嶋津）",m:"放駒 新（関脇・玉乃島）",loc:"東京都足立区",nsk:31,old:"松ヶ根部屋（〜2014年）→二所ノ関部屋（〜2021年12月）"},
{id:"田子ノ浦",en:"Tagonoura",ich:"二所ノ関",p:"二子山(旧)",y:"1989",f:"13代鳴戸（横綱・隆の里）",m:"田子ノ浦 伸一（前頭8・隆の鶴）",loc:"東京都江戸川区",nsk:55,old:"鳴戸部屋（〜2013年12月）"},
{id:"西岩",en:"Nishiiwa",ich:"二所ノ関",p:"田子ノ浦",y:"2018",f:"12代西岩（関脇・若の里）",m:"西岩 忍（関脇・若の里）",loc:"東京都台東区",nsk:10013},
{id:"二所ノ関",en:"Nishonoseki",ich:"二所ノ関",sou:1,p:"田子ノ浦",y:"2021",f:"16代荒磯（横綱・稀勢の里）",m:"二所ノ関 寛（横綱・稀勢の里）",loc:"茨城県阿見町",nsk:32,old:"荒磯部屋（〜2021年12月）"},
{id:"中村",en:"Nakamura",ich:"二所ノ関",p:"二所ノ関",y:"2024",f:"13代中村（関脇・嘉風）",m:"中村 雅継（関脇・嘉風）",loc:"東京都墨田区",nsk:23,note:"入門は尾車部屋（旧）。尾車部屋閉鎖後に二所ノ関部屋を経て独立"},
{id:"高田川",en:"Takadagawa",ich:"二所ノ関",p:"高砂",y:"1974",f:"8代高田川（大関・前の山）",m:"高田川 勝巳（関脇・安芸乃島）",loc:"東京都江東区",nsk:22,note:"高砂部屋から独立。高砂一門→無所属（1998年）→2011年に二所ノ関一門"},
{id:"湊川",en:"Minatogawa",ich:"二所ノ関",p:"春日野",y:"2004",f:"19代千賀ノ浦（関脇・舛田山）",m:"湊川 貴信（大関・貴景勝）",loc:"東京都板橋区",nsk:10018,old:"千賀ノ浦部屋（〜2020年11月）→常盤山部屋（〜2026年1月）",note:"春日野部屋から独立。出羽海一門→貴乃花一門→2018年に二所ノ関一門"},
{id:"湊",en:"Minato",ich:"二所ノ関",p:"時津風",y:"1982",f:"22代湊（小結・豊山）",m:"湊 孝行（前頭2・湊富士）",loc:"埼玉県川口市",nsk:16,note:"時津風部屋から独立。時津風一門→無所属（2017年）→2018年に二所ノ関一門"},
{id:"井筒(旧)",ich:"時津風",st:"def",p:"時津風",y:"1947",close:"2019",f:"11代井筒（関脇・鶴ヶ嶺）",note:"2019年に師匠急逝で閉鎖（陸奥部屋へ）"},
{id:"錣山",en:"Shikoroyama",ich:"二所ノ関",p:"井筒(旧)",y:"2004",f:"20代錣山（関脇・寺尾）",m:"錣山 矩幸（小結・豊真将）",loc:"東京都江東区",nsk:10005,note:"井筒部屋から独立。時津風一門→無所属（2017年）→2018年に二所ノ関一門"},
/* ---- 時津風一門 ---- */
{id:"伊勢ノ海",en:"Isenoumi",ich:"時津風",y:"1757以前",f:"不明",m:"伊勢ノ海 準人（前頭3・北勝鬨）",loc:"東京都文京区",nsk:14,note:"現存する最古の部屋。1942年に再興"},
{id:"時津風",en:"Tokitsukaze",ich:"時津風",sou:1,p:"立浪",y:"1941",f:"一代双葉山（横綱・双葉山）",m:"時津風 祐哉（前頭1・土佐豊）",loc:"東京都墨田区両国",nsk:11,old:"双葉山相撲道場（〜1945年）"},
{id:"荒汐",en:"Arashio",ich:"時津風",p:"時津風",y:"2002",f:"8代荒汐（小結・大豊）",m:"荒汐 栄吉（前頭2・蒼国来）",loc:"東京都中央区",nsk:10001},
{id:"陸奥(旧)",ich:"時津風",st:"def",close:"2024",note:"2024年4月に師匠の停年で閉鎖（音羽山・荒汐・追手風・伊勢ノ海へ）。2019年に井筒部屋（旧）の力士を受け入れた"},
{id:"音羽山",en:"Otowayama",ich:"時津風",p:"陸奥(旧)",y:"2023",f:"24代音羽山（横綱・鶴竜）",m:"音羽山 力三郎（横綱・鶴竜）",loc:"東京都墨田区",nsk:10016,note:"入門は井筒部屋（旧）"},
{id:"追手風",en:"Oitekaze",ich:"時津風",p:"大島",y:"1998",f:"11代追手風（前頭2・大翔山）",m:"追手風 直樹（前頭2・大翔山）",loc:"埼玉県草加市",nsk:52,note:"友綱部屋（現・大島部屋）から独立（大翔山の入門は立浪部屋）。2016年に伊勢ヶ濱一門→時津風一門"},
/* ---- 高砂一門 ---- */
{id:"高砂",en:"Takasago",ich:"高砂",sou:1,y:"1878",f:"初代高砂（前頭1・高砂）",m:"高砂 浦五郎（関脇・朝赤龍）",loc:"東京都墨田区",nsk:20,note:"最も古い一門の本家"},
{id:"錦戸",en:"Nishikido",ich:"高砂",p:"高砂",y:"2002",f:"10代錦戸（関脇・水戸泉）",m:"錦戸 眞幸（関脇・水戸泉）",loc:"東京都墨田区",nsk:10002},
{id:"九重",en:"Kokonoe",ich:"高砂",p:"出羽海",y:"1967",f:"11代九重（横綱・千代の山）",m:"九重 龍二（大関・千代大海）",loc:"東京都葛飾区",nsk:21,note:"出羽海部屋から独立し一門を破門され、高砂一門へ"},
{id:"八角",en:"Hakkaku",ich:"高砂",p:"九重",y:"1993",f:"8代八角（横綱・北勝海）",m:"八角 信芳（横綱・北勝海）",loc:"東京都墨田区",nsk:26,note:"師匠は日本相撲協会理事長"},
/* ---- 伊勢ヶ濱一門 ---- */
{id:"大島",en:"Oshima",ich:"伊勢ヶ濱",pt:"系譜は高嶋部屋から",y:"1922",f:"8代高嶋（前頭4・八甲山）",m:"大島 勝（関脇・旭天鵬）",loc:"東京都葛飾区",nsk:5,old:"高嶋部屋（〜1961年）→友綱部屋（〜2022年1月）"},
{id:"伊勢ヶ濱",en:"Isegahama",ich:"伊勢ヶ濱",sou:1,p:"大島",y:"1979",f:"3代安治川（関脇・陸奥嵐）",m:"伊勢ヶ濱 春雄（横綱・照ノ富士）",loc:"東京都墨田区",nsk:3,old:"安治川部屋（〜2007年11月）",note:"友綱部屋（現・大島部屋）から独立。旧・伊勢ヶ濱部屋とは別系統。宮城野部屋（2024年預かり、2026年消滅決定）の力士を受け入れ"},
{id:"安治川",en:"Ajigawa",ich:"伊勢ヶ濱",p:"伊勢ヶ濱",y:"2022",f:"8代安治川（関脇・安美錦）",m:"安治川 竜児（関脇・安美錦）",loc:"東京都江東区",nsk:8},
{id:"浅香山",en:"Asakayama",ich:"伊勢ヶ濱",p:"大島",y:"2014",f:"15代浅香山（大関・魁皇）",m:"浅香山 博之（大関・魁皇）",loc:"東京都墨田区",nsk:10010,note:"友綱部屋（現・大島部屋）から独立"},
{id:"朝日山",en:"Asahiyama",ich:"伊勢ヶ濱",p:"尾車(旧)",y:"2016",f:"19代朝日山（関脇・琴錦）",m:"朝日山 宗功（関脇・琴錦）",loc:"千葉県鎌ケ谷市",nsk:4,note:"尾車部屋から独立（入門は佐渡ヶ嶽部屋）。2017年に二所ノ関一門→伊勢ヶ濱一門"},
];

const HMAP=Object.fromEntries(HEYA_DATA.map(h=>[h.id,h]));
const HEN=Object.fromEntries(HEYA_DATA.filter(h=>h.en).map(h=>[h.en,h]));
const ICOL=Object.fromEntries(ICHIMON.map(i=>[i.k,i.c]));
const ichOf=en=>HEN[en]?HEN[en].ich:"";
const ichDot=ich=>ich?`<span class="dot" style="background:${ICOL[ich]}" title="${ich}一門"></span>`:"";
const heyaLink=en=>HEN[en]?`<a class="rk" href="#heya-${en}">${esc(HEN[en].id)}</a>`:esc(heya(en));
