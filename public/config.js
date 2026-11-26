/* 가격 설정 파일이에요.
   프리미엄 리포트 가격은 제품 책임자가 정한 값이에요.
   가격을 바꾸려면 아래 숫자 한 곳만 고치면 돼요. 화면 전체(프리미엄 페이지, FAQ 등)가 이 값을 같이 써요.
   단위는 원이에요. 쉼표나 '원' 글자는 넣지 않아요. */
window.PRICE_WON = 11999;

/* 화면에 보여 줄 가격 글자를 만들어 줘요. 예: 11999 -> ₩11,999 */
window.priceText = function () {
  return '₩' + Number(window.PRICE_WON).toLocaleString('ko-KR');
};
