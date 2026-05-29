---
title: "ROI 계산"
notebook: "InterStellar"
section_group: "2_6 hexagonal pillars_Rocks_Helm"
section: "1. Character"
onenote_id: "0-198192fc98ba5caea6ef6a92a2e71496!1-733661839CC53BA5!7914"
---

ROI 계산
		
		
	
	
		
			
Return On Investment(ROI, 투자수익률)
			

			
비용과 편익
			
1/ 새로운 자산 취득이나 사업 기회에서 발생할 모든 비용 검토
			
2/ 비용 절감액 추정
			
3/ 투자로 창출될 현금의 양 추정
			
4/ 예상 비용, 절감액, 현금흐름을 기록한 시간표를 만들고, 추정에 대한 민감도 분석을 시행한다.
			
5/ 수량화하기 힘든 비용과 편익을 평가한다.
			

			
				
					회수기간
					투자금 회수에 소요되는 기간
					
초기 투자금/매년 예상되는 평균 현금흐름이나 비용절감액￼10만 달러 기계/매년 1만 8천달러 절감=5.56년
					
취득 자산의 내용년수 확인 필요
					
				
				
					
Net Present Value￼NPV
					
순현재가치
					
					기대 현금흐름을 할인하여 현재가치 산출
					[NPV](https://support.office.com/ko-kr/article/npv-%ED%95%A8%EC%88%98-8672cb67-2576-4d07-b67b-ac28acf2a568)함수 =NPV(할인율,연도별 회수금1:N)+(-초기투자비용) 기대수익률을 한인율로 활용(Hurdle rate)
				
				
					
Internal Rate of Return
					
내부 수익률
					
					
NPV를 0으로 두고, 수익률 산출
					
즉, NPV를 0으로 만드는 할인율
					
					[IRR ](https://support.office.com/ko-kr/article/%ED%98%84%EA%B8%88-%ED%9D%90%EB%A6%84%EC%97%90-%EB%A7%9E%EC%B6%B0-%EC%82%AC%EC%9A%A9-excel%EC%97%90%EC%84%9C-npv-%EB%B0%8F-irr-%EA%B3%84%EC%82%B0-9e3d78bb-f1de-4f8e-a20e-b8955851690c)계산 =IRR(values, [guess])￼내부 수익률을 계산할 값이 들어 있는 셀에 대한 참조 또는 배열, IRR의 결과값에 가깝다고 추측되는 수입니다. 생략할 경우 0.1부터 시작
				
				
					
Break Even Point
					
손익분기점
					
					
총 공헌이익 = 총 고정비. 지점.
					
매출을 얼마나 달성해야 재무적으로 본전.
					
공헌이익*이 총 투자비와 같아지는 매출수량.
					
*제품 한 개의 매출에서 제품 한개분의 변동비(재료비, 직접노무비)를 뺀 금액.(=한계이익)
					
					
  제품 단위당 매출
					
- 제품 단위당 변동비
					
  = 공헌이익
					
고정비/1-변동비율(변동비/비용)=손익분기점 매출액
					
총 고정비/개당 공헌이익=손익분기점 매출수량
					

					
안전마진(Margin of safety) 손실을 발생시키지 않는 선의 판매량 감소분
					

					
				
			
			
[공헌이익](https://m.mk.co.kr/news/economy/view/2017/06/395251/) - 고정비를 회수하고 순이익을 증가시키는 데 이바지하는 이익
			

			
화폐의 시간가치: 오늘의 1달러가 내일의 1달러보다 가치 있다.
			

			

			
순현재가치, 내부수익률, 손익분기점, 민감도 분석(Sensitivity analysis)
			

			
ㅇ 비용-판매량-이익(CVP분석)
			
현실적/ 낙관적/ 비관적 3가지 시나리오 제시