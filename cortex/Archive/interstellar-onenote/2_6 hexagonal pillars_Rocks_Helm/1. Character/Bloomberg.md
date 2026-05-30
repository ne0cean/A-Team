---
title: "Bloomberg"
notebook: "InterStellar"
section_group: "2_6 hexagonal pillars_Rocks_Helm"
section: "1. Character"
onenote_id: "0-e8c9542d031fa3aa93199ad4dfc96fff!1-733661839CC53BA5!7914"
---

Bloomberg

베타(BL)

Rm(시장수익률): Risk premium + Rf

Rf(무위험이자율): 국채 5년물 수익률

1/ 홍콩 증시의 기대수익 (특히, 고객님께서 홍콩 5년물 국채 수익률과 함께 문의를 보내주셨다는 점을 감안)

국가 위험 프리미엄 기능{CRP &lt;Go&gt;}

시장수익률(Market Return) 그리고 RF(Risk-Free) 금리 열람 바랍니다. 다만, 고객님께서 홍콩 5년물을 보신 것과는 다르게 해당 화면 에서 RF 금리는 10년물 국채를 사용합니다.

결국 홍콩의 시장수익률은 {CRP &lt;Go&gt;}에서 확인 가능하며, 이는 주요 지수에 상장된 회사들의 IRR(내부수익률)의 가중평균값입니다. IRR은 배당 할인 모형을 이용하여 계산되었으며 {DDM &lt;Go&gt;} 페이지를 통해 자세한 내용을 보실 수 있습니다.

이 부분의 경우에는 유선상 원하시는 산출 방법론 확인을 부탁드렸습니다. 고객님께서 확인해주신 부분은 HSI Index를 홍콩 증시를 대표하는 지수로 설정하여, HSI Index FA &lt;GO&gt; 기능에서 &quot;주가수익률(PER)&quot; 값의 예상치/컨센서스 값을 열람하시겠다는 부분을 전달 받았습니다. 해당 화면에서 열람되시는 데이터 값(예를 들어 10.83)을 클릭하시면 bottom up 방식으로 산출한 방법/수식 열람 가능합니다.

2/ 홍콩 5년물 국채 수익률: GGR &lt;GO&gt; &gt; 홍콩 선택 &gt; 5Y로 명시된 5년물 열람 가능합니다. 이 부분을 마우스 드래그 하셔서 다른 패널로 옮겨주시면, 티커가 로드되며 HP 기능으로 이동해 GTHKD5YR&#160; Corp HP &lt;GO&gt; 국채 수익률 추이 확인 가능합니다. 티커의 형식은 GT - 제네릭, HKD - 홍콩, 5YR - 5년물로 구분되어 다른 제너릭 국채티커 역시 동일하게 구현됩니다.

&#160;

&#160;

네 고객님, 먼저 명령창에 HSI Index 를 입력해주시면 아래 관련 용어들로 HSI Index 가 확인되실 겁니다. 해당 Index 를 클릭하여 주시거나 HSI 입력 + 키보드에 F10 Index 버튼 클릭 해주시고 엔터를 눌러주시면 해당 index 가 터미널에 자동 로딩이 됩니다.

추가적으로, 시장수익률 수치는 historical - 즉 과거의 관점으로 보는 것이 아닌 &quot;전망(Forward Looking Analysis)&quot;을 나타내는 점이며, {EEO &lt;Go&gt;} 컨센서스/예상치 데이터를 기반으로 산출됩니다.

추가적으로 궁금하신 점이 있으시면 {CRP &lt;Go&gt;} 기능에서 키보드 F1을 눌러주셔서, 안내페이지를 확인해주시기 바랍니다. 구체적으로 궁금하시거나 도움이 필요하신

[https://libguides.ust.hk/bloomberg/tickers](https://libguides.ust.hk/bloomberg/tickers)

[Excel 매크로] 모든 워크시트의 수식을 제거하고 값으로 저장하기

Sub SaveAsValue()

&#160;&#160;&#160; Dim wksht As Worksheet

&#160;&#160;&#160; For Each wksht In ThisWorkbook.Worksheets

&#160;&#160;&#160;&#160;&#160;&#160;&#160; wksht.Cells.Copy

&#160;&#160;&#160;&#160;&#160;&#160;&#160; wksht.Cells.PasteSpecial xlPasteValues

&#160;&#160;&#160; Next

&#160;&#160;&#160; Application.CutCopyMode = False

End Sub&#160;
