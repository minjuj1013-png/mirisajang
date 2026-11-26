/* 후기 데이터 파일이에요. 프리미엄 페이지의 후기 카드가 여기서 글을 가져가요.

   지금은 실제 후기가 없어서 모두 '가상 예시'(kind: 'sample')예요.
   실제 후기를 넣을 때는 이렇게 해 주세요.
     1) 작성한 사람의 동의를 받고 원문 그대로만 옮겨요. 글을 고치거나 지어내지 않아요.
     2) 그 후기의 kind 를 'real' 로 바꿔요. ('sample' 이면 카드에 '가상 예시' 표시가 붙어요.)
     3) 수치·수익·성과를 말하는 후기는 확인하기 전에는 넣지 않아요.
   항목 하나는 { } 한 덩어리이고, 덩어리 사이에는 쉼표(,)를 꼭 넣어요.
     quote 후기 한 줄 / name 이름(실제 후기는 동의받은 표기) / role 설명 / shape, tone 아바타 자리 도형 */
window.TESTIMONIALS = [
  { kind: 'sample', quote: '숫자가 어떤 근거에서 나왔는지 한눈에 볼 수 있어서 좋았어요.', name: '이름 자리', role: '예비 창업자 예시', shape: 'circle', tone: 'brand' },
  { kind: 'sample', quote: '본사에 무엇을 물어봐야 할지 정리돼서 계약 전에 마음이 편했어요.', name: '이름 자리', role: '예비 창업자 예시', shape: 'hexagon', tone: 'teal' },
  { kind: 'sample', quote: '후보를 나란히 놓고 보니 비교하기가 쉬웠어요.', name: '이름 자리', role: '예비 창업자 예시', shape: 'diamond', tone: 'ink' }
];
