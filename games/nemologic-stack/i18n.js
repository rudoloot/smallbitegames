/* Shared Korean/English UI. Original text is retained when a rendered node is translated. */
(() => {
  const messages=new Map(Object.entries({
    '4단계 명암':'Grayscale','4색 컬러':'4 colors','도안 표현':'Picture colors','스택 입력':'Height input','완성된 그림':'Completed picture','색상':'Color',
    '컬러':'Color','컬러로 전환':'Switch to color','명암으로 전환':'Switch to grayscale',
    '0~3의 값마다 정해진 색으로 그림을 완성해요. ×는 0이에요. 4색 컬러와 4단계 명암은 같은 문제이며, 전환해도 단서와 입력은 그대로예요.':'Each value from 0 to 3 has its own color. × means 0. Color and grayscale show the same puzzle; switching preserves the clues and your entries.',
    '빈 보드에서 시작해요. 같은 값의 구간 합과 최대 높이를 살펴보세요.':'Start with an empty board. Check equal-value run sums and the maximum height.',
    '게임 도움말':'Game help','도움말 닫기':'Close help','설정':'Settings','설정 닫기':'Close settings','뒤로가기':'Back',
    '문제를 불러오는 중입니다.':'Loading puzzle…','다시 시도':'Try again','문제 목록으로':'Puzzle list',
    '언어':'Language','조작 안내 표시':'Show control guide','게임 방법':'How to play','처음부터 다시 풀기':'Restart puzzle',
    '숨은 그림 찾기':'Reveal the hidden picture','힌트 숫자 읽기':'Reading the clues','조작 방법':'Controls',
    '각 칸을 0~3의 명암으로 채워 그림을 완성해요. ×는 0(흰색), 1은 밝은 회색, 2는 어두운 회색, 3은 검정이에요.':'Fill each cell with a shade from 0 to 3. × means 0 (white), 1 is light gray, 2 is dark gray, and 3 is black.',
    '빨강·녹색·파랑 탭에서 각 색상을 0~3의 값으로 채워 그림을 완성해요. 세 색상의 값을 조합해 칸의 색을 만들어요.':'Use the Red, Green, and Blue tabs to fill each channel with values from 0 to 3. The three values combine to make each cell’s color.',
    '위·왼쪽:':'Top and left:',
    '같은 값이 이어진 구간의 합이에요. 값이 2인 칸이 세 칸 이어지면 2 + 2 + 2 = 6으로 표시해요. 가로줄은 왼쪽부터, 세로줄은 위부터 읽어요.':' Each clue is the sum of a run of equal values. Three adjacent cells with a value of 2 give 2 + 2 + 2 = 6. Read rows from left to right and columns from top to bottom.',
    '오른쪽·아래:':'Right and bottom:','해당 행·열에서 가장 큰 값이에요.':' The largest value in that row or column.',
    '0인 구간은 단서에서 생략해요. 같은 값의 두 구간 사이에는 0이 필요하고, 서로 다른 값의 구간은 붙을 수 있어요.':'Zero runs are omitted. Separate runs of the same value need a zero between them; runs of different values may touch.',
    '미정과 ×:':'Unknown and ×:','빈칸은 아직 정하지 않은 칸, ×는 0으로 확정한 칸이에요. 지우개는 미정으로 되돌려요.':' A blank cell is undecided; × confirms a value of 0. The eraser makes a cell unknown again.',
    '십자키:':'D-pad:','한 번 누르면 한 칸 이동해요. 0.5초 이상 누르고 있으면 0.2초마다 반복 이동해요.':' Tap to move one cell. Hold for 0.5 seconds to begin moving every 0.2 seconds.',
    '십자키 모드:':'D-pad mode:','오른쪽 숫자·×·지우개 버튼을 누르면 선택한 칸에 바로 적용해요. 버튼을 누른 채 십자키로 이동하면 지나가는 칸마다 입력해요.':' Number, ×, and eraser buttons immediately apply to the selected cell. Hold a button while moving with the D-pad to apply it to each cell you enter.',
    '터치 모드:':'Touch mode:','게임판을 직접 누르면 십자키가 흐려지고 선택 테두리가 사라져요. 오른쪽 버튼으로 값을 고른 뒤 칸을 누르거나 드래그해서 입력해요. 십자키를 다시 누르면 십자키 모드로 돌아가요.':' Touch the board to dim the D-pad and hide the cursor. Choose a value on the right, then tap or drag on the board to enter it. Touch the D-pad to return to D-pad mode.',
    '최근 입력을 되돌려요. 한 번의 드래그는 한꺼번에 취소해요.':' Undo your last entry. A single drag is undone as one action.',
    '선택한 행·열의 단서는 노란색으로 강조돼요. 맞춰진 구간의 단서는 초록색, 현재 입력으로 성립할 수 없는 단서는 빨간색으로 표시돼요.':'The selected row and column have yellow clues. Matched runs turn green; clues that cannot match your current entries turn red.',
    '전체 탭:':'All tab:','RGB 합산 높이(0~9)의 단서와 현재 누적값을 확인해요. 전체 탭에서는 입력할 수 없으며, 완성하면 그림이 나타나요.':' Check clues for combined RGB heights (0–9) and your current totals. This tab is read-only. The finished picture appears when you solve the puzzle.',
    '키보드: 방향키로 이동 · 0~3으로 값 선택 · Delete로 지우개 · Ctrl/⌘+Z로 되돌리기':'Keyboard: arrow keys to move · 0–3 to select a value · Delete for the eraser · Ctrl/⌘+Z to undo',
    '튜토리얼 시작하기':'Start tutorial',
    '왼쪽 십자키로 칸을 이동해요. 오른쪽 버튼을 누른 채 이동하면 지나가는 칸마다 입력해요. 방향 버튼을 0.5초 이상 누르면 0.2초마다 반복 이동해요. 게임판을 직접 누르면 터치 모드가 되어 오른쪽 버튼으로 값만 선택하고 칸을 터치해서 입력해요. 십자키를 다시 누르면 십자키 모드로 돌아가요.':'Move with the D-pad. Hold an action button while moving to apply it to each cell. Hold a direction for 0.5 seconds to repeat every 0.2 seconds. Touch the board to enter touch mode: choose a value, then tap cells to enter it. Touch the D-pad to switch back.',
    '5×5 완성 예시':'Completed 5×5 example','5×5 완성된 하트와 구간 합·최댓값 힌트':'Completed 5 by 5 heart with run-sum and maximum-value clues',
    '튜토리얼에서 완성하는 하트예요. 칸 안에는 입력한 값을, 바깥에는 힌트 숫자를 표시했어요.':'This is the heart you complete in the tutorial. Numbers inside cells are entered values; numbers outside are clues.',
    '강조한 셋째 줄은 2가 다섯 칸이므로 구간 합은 10, 최댓값은 2예요.':'In the highlighted third row, five cells with a value of 2 give a run sum of 10 and a maximum value of 2.',
    '지우개':'Eraser','지우개 선택':'Select eraser','되돌리기':'Undo','위로 이동':'Move up','아래로 이동':'Move down','왼쪽으로 이동':'Move left','오른쪽으로 이동':'Move right',
    '칸 이동 십자키. 방향키로도 이동할 수 있어요':'D-pad. You can also use the arrow keys.','칸 이동 십자키':'D-pad','높이 입력':'Height controls','입력할 스택 선택':'Select a height',
    '빨강':'Red','녹색':'Green','파랑':'Blue','전체':'All','명암':'Grayscale','명암 입력':'Grayscale input','색상 탭':'Color tabs',
    '흑백 게임 목록':'Grayscale puzzles','컬러 게임 목록':'Color puzzles','문제 페이지':'Puzzle pages','이전 페이지':'Previous page','다음 페이지':'Next page',
    '명암 스택 입력':'Grayscale height input','색상별 스택 입력':'Color height input','명암 전체뷰':'Grayscale overview','RGB 전체뷰':'Combined RGB view',
    '처음부터 다시 풀까요?':'Restart this puzzle?','입력한 높이를 모두 지우고 빈 보드에서 시작해요.':'Clear your entries and start with an empty board.',
    '계속 풀기':'Keep playing','다시 시작':'Restart','숨은 그림을 찾았어요!':'You found the hidden picture!','숨은 그림을 완성했어요.':'You completed the hidden picture.',
    '완성된 그림 보기':'View finished picture','완성된 흑백 그림':'Completed grayscale picture','다음 문제 풀기':'Next puzzle','흑백게임 목록으로':'Grayscale puzzles',
    '위·왼쪽':'Top and left','아래·오른쪽':'Bottom and right','연속 칸 수':'Run lengths','최대 높이':'Maximum height',
    '↘ 대각선':'↘ Diagonal','↙ 대각선':'↙ Diagonal',
    '세 가지 색으로 숨은 그림을 완성했어요.':'You combined three colors to reveal the hidden picture.',
    '이 브라우저에서는 자동 저장할 수 없어요.':'This browser cannot save your progress automatically.',
    '현재 브라우저에서는 자동 저장이 제한돼요. 이 창을 열어둔 채 플레이해 주세요.':'Automatic saving is limited in this browser. Keep this window open while playing.',
    '이미 모든 높이를 찾았어요!':'You have already found every height!',
    '현재 입력에서 새로운 확정 칸을 찾지 못했어요.':'No new forced cell was found from your current entries.',
    '모든 높이가 정확해요. 완성!':'Every height is correct. Complete!',
    '입력한 높이는 모두 맞아요. 미정인 칸을 계속 풀어 보세요.':'Your entries are correct. Keep solving the unknown cells.',
    '빈 보드에서 시작해요. RGB 합계와 같은 높이 구간을 살펴보세요.':'Start with an empty board. Check RGB totals and equal-height runs.',
    '같은 높이 구간의 스택 합계와 최대 높이를 단서로 시작해 보세요.':'Start with the equal-height run sums and the maximum height of each line.',
    '미정':'Unknown','빈 줄':'Empty line','행 미선택':'No row selected','열 미선택':'No column selected',
    '5×5 튜토리얼':'5×5 tutorial','다시 배우기':'Start over','튜토리얼 안내':'Tutorial guide','5행 5열 명암 퍼즐':'5 by 5 grayscale puzzle','이전':'Previous','다음 →':'Next →','흑백게임 시작 →':'Play grayscale puzzles →','하트':'Heart',
    '조개':'Seashell','고래':'Whale','상어':'Shark','펭귄':'Penguin','토끼':'Rabbit','고양이':'Cat','부엉이':'Owl','오리':'Duck','문어':'Octopus','판다':'Panda','사자':'Lion','돌고래':'Dolphin','사슴':'Deer','기린':'Giraffe','거북이':'Turtle','원숭이':'Monkey','호랑이':'Tiger','공룡':'Dinosaur','앵무새':'Parrot','박쥐':'Bat',
    '무당벌레':'Ladybug','잠자리':'Dragonfly','꿀벌':'Bee','사슴벌레':'Stag beetle','장수풍뎅이':'Rhinoceros beetle','쇠똥구리':'Dung beetle','빗방울':'Raindrop','무지개':'Rainbow','눈송이':'Snowflake','석양':'Sunset','클로버':'Clover','선인장':'Cactus','대나무':'Bamboo','민들레':'Dandelion',
    '체리':'Cherries','수박':'Watermelon','딸기':'Strawberry','코코넛':'Coconut','아보카도':'Avocado','막대아이스크림':'Ice pop','도넛':'Donut','쿠키':'Cookie','초콜릿':'Chocolate','빙수':'Shaved ice',
    '모자':'Hat','리본':'Ribbon','양말':'Socks','부츠':'Boots','셔츠':'Shirt','원피스':'Dress','게임패드':'Gamepad','축구공':'Soccer ball','도미노':'Dominoes','바둑판':'Go board','음표':'Musical note','악보':'Sheet music','미러볼':'Disco ball','피아노':'Piano','메트로놈':'Metronome','색소폰':'Saxophone','아코디언':'Accordion',
    '컵':'Cup','숟가락':'Spoon','포크':'Fork','냄비':'Pot','시계':'Clock','우산':'Umbrella','주전자':'Kettle','계량컵':'Measuring cup','유모차':'Stroller','빨래집게':'Clothespin','뚫어뻥':'Plunger','쓰레기통':'Trash can','치약':'Toothpaste','면도기':'Razor','세탁기':'Washing machine','욕조':'Bathtub','세면대':'Washbasin',
    '텔레비전':'Television','모니터':'Monitor','라디오':'Radio','헤드폰':'Headphones','계산기':'Calculator','카메라':'Camera','전기밥솥':'Rice cooker','토스터':'Toaster','냉장고':'Refrigerator','충전기':'Charger','스탠드조명':'Desk lamp','믹서기':'Blender','전기주전자':'Electric kettle','오븐':'Oven','에어컨':'Air conditioner','커피머신':'Coffee machine','데스크톱컴퓨터':'Desktop computer',
    '자물쇠':'Padlock','연필':'Pencil','주사기':'Syringe','곡괭이':'Pickaxe','사다리':'Ladder','전동드릴':'Power drill','금고':'Safe','컴퍼스':'Drawing compass','화살표':'Arrow','신호등':'Traffic light','기차':'Train','버스':'Bus','트럭':'Truck','로켓':'Rocket','열기구':'Hot air balloon','돛단배':'Sailboat','등대':'Lighthouse','잠수함':'Submarine','소방차':'Fire engine','구급차':'Ambulance','헬리콥터':'Helicopter','자전거':'Bicycle','킥보드':'Kick scooter','트랙터':'Tractor','굴착기':'Excavator','지게차':'Forklift','우주선':'Spaceship',
    '해골':'Skull','꼬마유령':'Little ghost','눈사람':'Snowman','로봇':'Robot','외계인':'Alien','잭오랜턴':'Jack-o’-lantern','닌자':'Ninja','산타':'Santa','허수아비':'Scarecrow','용사':'Hero','요정':'Fairy','인어':'Mermaid',
    '강아지':'Puppy','코끼리':'Elephant','하마':'Hippopotamus','곰':'Bear','뱀':'Snake','당나귀':'Donkey','매미':'Cicada','달팽이':'Snail','번개':'Lightning','토네이도':'Tornado',
    '푸딩':'Pudding','케이크':'Cake','와플':'Waffle','솜사탕':'Cotton candy','머핀':'Muffin','사이다':'Lemon-lime soda','가방':'Bag','바람개비':'Pinwheel','딱지':'Ddakji','탁구채':'Table tennis paddle','미니카':'Toy car','권총':'Pistol','북':'Drum','가면':'Mask',
    '침대':'Bed','책상':'Desk','휴지':'Toilet paper','선풍기':'Fan','멀티탭':'Power strip','디스켓':'Floppy disk','망치':'Hammer','톱':'Saw','클립':'Paper clip','도끼':'Axe','호루라기':'Whistle','광대':'Clown','마녀':'Witch','마법사':'Wizard','우주비행사':'Astronaut',
    '0 흰색':'0 white','1 밝은 회색':'1 light gray','2 어두운 회색':'2 dark gray','3 검정':'3 black',
    '숨은 그림을 함께 찾아봐요':'Let’s reveal a hidden picture',
    '이 판은 가로 5칸, 세로 5칸이에요. 지금은 모두 미정이에요. 말풍선을 읽고 다음을 누르면 한 단계씩 함께 풀 수 있어요.':'This board has 5 rows and 5 columns. All cells are unknown. Read the guide and press Next to solve it one step at a time.',
    '칸 안의 숫자 = 색의 진하기':'Cell numbers show the shade',
    '×는 0, 즉 흰색이에요. 1은 밝은 회색, 2는 어두운 회색, 3은 검정이에요. 숫자가 커질수록 진해져요.':'× means 0, or white. 1 is light gray, 2 is dark gray, and 3 is black. Higher numbers make darker shades.',
    '흰색 → 검정':'White → black','오른쪽·아래 = 가장 큰 숫자':'Right and bottom show the maximum',
    '오른쪽은 가로줄, 아래는 세로줄의 가장 큰 숫자예요. 최대가 1인 둘째 가로줄에는 0과 1만 넣을 수 있어요.':'The right edge shows each row’s maximum; the bottom shows each column’s maximum. Row 2 has a maximum of 1, so it can only contain 0 and 1.',
    '왼쪽·위 = 붙어 있는 숫자의 합':'Left and top show run sums',
    '같은 숫자가 이어진 묶음마다 더해서 적어요. 둘째 줄은 합 5, 최대 1이므로 1 다섯 칸으로 채워요.':'Add each run of equal heights. Row 2 has a sum of 5 and a maximum of 1, so fill it with five 1s.',
    '표시된 칸을 누르거나 다음을 눌러 함께 채워요.':'Tap the marked cells, or press Next to fill them together.',
    '단서 10은 2 다섯 칸의 합이에요':'A clue of 10 can mean five 2s',
    '셋째 줄은 합 10, 최대 2예요. 2를 다섯 칸 이어 넣으면 2 + 2 + 2 + 2 + 2 = 10이 돼요.':'Row 3 has a sum of 10 and a maximum of 2. Five adjacent 2s make 2 + 2 + 2 + 2 + 2 = 10.',
    '3이 세 칸이면 단서는 9':'Three 3s give a clue of 9',
    '넷째 줄은 합 9, 최대 3이에요. 3 + 3 + 3 = 9이므로 세 칸이 이어져요. 가운데에 놓고 세로 단서도 확인해요.':'Row 4 has a sum of 9 and a maximum of 3. Since 3 + 3 + 3 = 9, three cells join together. Put them in the middle and check the column clues.',
    '여러 숫자는 묶음의 순서예요':'Clues list the runs in order',
    '가운데 세로줄의 1 · 2 · 6을 위에서 아래로 읽어요. 1 한 칸, 2 한 칸, 3 두 칸이에요. 마지막 6은 3 + 3의 합이에요.':'Read the middle column’s 1 · 2 · 6 from top to bottom: one 1, one 2, and two 3s. The final 6 is the sum of 3 + 3.',
    '빈칸으로 떨어지면 따로 더해요':'A zero separates equal-height runs',
    '첫째 줄의 1 · 1은 떨어져 있는 1 두 칸이에요. 사이의 0은 단서에서 생략해요. 세로 단서에 맞춰 둘째·넷째 칸을 채워요.':'The first row’s 1 · 1 means two separate 1s. The zero between them is omitted from the clues. Use the column clues to fill the second and fourth cells.',
    '빈 곳을 확정할 때는 X':'Use × to confirm an empty cell',
    '미정인 칸과 흰색으로 확정한 칸은 달라요. 이제 남은 칸에 ×를 넣어 0으로 확정해요. 0 구간은 위·왼쪽 단서에서 생략돼요.':'Unknown cells and confirmed white cells are different. Mark the remaining cells with × to confirm 0. Zero runs are omitted from the top and left clues.',
    '지우개는 미정으로 되돌려요':'The eraser makes a cell unknown',
    '지우개로 둘째 줄 가운데를 지워볼게요. X를 넣는 것과 달리, 아직 결정하지 않은 빈칸으로 돌아가요.':'Use the eraser on the middle cell of row 2. Unlike ×, it returns the cell to an undecided state.',
    '지우개를 고른 뒤 표시된 칸을 누르거나 다음을 눌러요.':'Choose the eraser, then tap the marked cell, or press Next.',
    '되돌리기로 방금 작업을 취소해요':'Undo restores your last entry',
    '방금 지운 칸을 되돌리면 원래의 1로 돌아와요. 실제 게임에서는 한 번의 드래그도 되돌리기 한 번으로 취소할 수 있어요.':'Undo restores the erased cell to 1. In the game, a whole drag can also be undone with one action.',
    '되돌리기를 누르거나 다음을 눌러 복원해요.':'Press Undo or Next to restore it.',
    '십자키로 칸을 이동해요':'Move with the D-pad',
    '왼쪽 십자키로 선택 테두리를 움직여요. 오른쪽 버튼을 누른 채 움직이면 0.2초마다 이동하는 칸에 입력해요. 버튼을 놓으면 값은 바뀌지 않아요.':'Move the cursor with the left D-pad. Hold a button on the right to apply it to each cell while moving. After the initial delay, movement repeats every 0.2 seconds. Release the action button to stop entering values.',
    '그림 완성! 이제 직접 풀어봐요':'Picture complete! Try a puzzle',
    '밝은 회색에서 검정까지, 명암을 쌓아 숨은 그림을 찾았어요. 흑백게임에서는 같은 방법으로 10×10 그림에 도전할 수 있어요.':'You used shades from light gray to black to reveal the picture. Try the same rules on a 10×10 grayscale puzzle.',
    '말풍선에서 안내하는 도구와 초록 테두리 칸을 따라가 보세요. 다음을 눌러 함께 채울 수도 있어요.':'Follow the guide’s tool and the cells outlined in green. You can also press Next to fill them together.'
  }));
  let language='ko';try{if(localStorage.getItem('nonogram-stack-language')==='en')language='en';}catch{}
  const originals=new WeakMap(),attributeOriginals=new WeakMap();
  function translate(source){
    const text=source.trim();
    if(messages.has(text))return source.replace(text,messages.get(text));
    let match;
    const axis=value=>value==='행'?'Row':'Column';
    if((match=text.match(/^최대 (\d+)$/)))return `Maximum ${match[1]}`;
    if((match=text.match(/^단서 (.+)$/)))return `Clues ${match[1]}`;
    if((match=text.match(/^1 × 5칸 = 5$/)))return '1 × 5 cells = 5';
    if((match=text.match(/^2 × 5칸 = 10$/)))return '2 × 5 cells = 10';
    if((match=text.match(/^3 × 3칸 = 9$/)))return '3 × 3 cells = 9';
    if((match=text.match(/^(?:흑백 )?문제 (\d+) (시작|완료|계속하기|준비중)$/)))return `${text.startsWith('흑백')?'Grayscale puzzle':'Puzzle'} ${Number(match[1])}: ${{시작:'Start',완료:'Completed',계속하기:'Continue',준비중:'Coming soon'}[match[2]]}`;
    if((match=text.match(/^(\d+)문제 목록으로$/)))return `Back to ${match[1]} puzzles`;
    if((match=text.match(/^(\d+)개의 높이를 모두 찾았어요\.$/)))return `All ${match[1]} heights are complete.`;
    if((match=text.match(/^완성! (\d+)개의 높이가 모두 맞아요\.$/)))return `Complete! All ${match[1]} heights are correct.`;
    if((match=text.match(/^(\d+)칸의 입력을 되돌렸어요\.$/)))return `Undid ${match[1]} cell(s).`;
    if((match=text.match(/^화면에 맞춘 (\d+)×(\d+) 입력판$/)))return `${match[1]} by ${match[2]} board fitted to the screen`;
    if((match=text.match(/^(\d+)행 (\d+)열 피크로스$/)))return `${match[1]} by ${match[2]} nonogram`;
    if((match=text.match(/^(?:전체 )?(\d+)(행|열) (동일 높이 구간|연속 칸 수|구간 스택 합계|구간 합|최대 높이|최대|스택 합) (.*)$/)))return `${text.startsWith('전체')?'Combined ':''}${axis(match[2])} ${match[1]}, ${match[3].startsWith('최대')?'maximum height':'run sums'} ${match[4].replace('빈 줄','empty')||'empty'}`;
    if((match=text.match(/^(\d+)행 (\d+)열(.*)$/))){
      const detail=match[3].replace(/RGB 전체뷰/g,'Combined RGB view').replace(/명암/g,'Grayscale').replace(/색상/g,'Color').replace(/빨강/g,'Red').replace(/녹색/g,'Green').replace(/파랑/g,'Blue').replace(/미정/g,'unknown').replace(/(\d+)스택/g,'height $1').replace(/공개 높이/g,'given').replace(/안내 칸/g,'guided cell').replace(/현재 누적 /g,'current total ').replace(/완성된 색상/g,'finished color');
      return `Row ${match[1]}, column ${match[2]}${detail}`;
    }
    if(/^(행 미선택|\d+행), (열 미선택|\d+열)$/.test(text))return text.replace('행 미선택','No row selected').replace('열 미선택','No column selected').replace(/(\d+)행/,'Row $1').replace(/(\d+)열/,'column $1');
    if((match=text.match(/^(명암|컬러|빨강|녹색|파랑|전체) 퍼즐$/)))return `${match[1]==='컬러'?'Color':messages.get(match[1])} puzzle`;
    if((match=text.match(/^(\d+)스택$/)))return `Height ${match[1]}`;
    if((match=text.match(/^NonogramStack · (흑백|컬러) 게임으로 전환$/)))return `NonogramStack · Switch to ${match[1]==='흑백'?'grayscale':'color'} puzzles`;
    if((match=text.match(/^완성된 문제 (\d+) 그림$/)))return `Completed picture for puzzle ${Number(match[1])}`;
    if((match=text.match(/^정답과 다른 입력이 (\d+)개 있어요\. 색상 탭의 붉은 테두리 칸을 확인해 주세요\.$/)))return `${match[1]} entries differ from the solution. Check the cells outlined in red in the color tabs.`;
    if((match=text.match(/^흑백 문제 (\d+) · 노노그램스택$/)))return `Grayscale puzzle ${Number(match[1])} · NonogramStack`;
    if(text==='튜토리얼 · 노노그램스택')return 'Tutorial · NonogramStack';
    if(text.includes('· 노노그램스택'))return text.replace('노노그램스택','NonogramStack').replace(/문제 (\d+)/,'Puzzle $1').replace('과일 정물','Fruit still life').replace('스택 피크로스','Stack nonogram');
    return source;
  }
  function localize(root=document.body){
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){
      const node=walker.currentNode;
      if(node.parentElement?.closest('script,style,option,[translate="no"]'))continue;
      const old=originals.get(node),source=old&&node.nodeValue===old.output?old.source:node.nodeValue;
      const output=language==='en'?translate(source):source;
      originals.set(node,{source,output});if(node.nodeValue!==output)node.nodeValue=output;
    }
    for(const el of [root,...root.querySelectorAll('[aria-label],[title]')])for(const name of ['aria-label','title']){
      if(!el.hasAttribute(name))continue;
      const entries=attributeOriginals.get(el)||{},value=el.getAttribute(name),old=entries[name],source=old&&value===old.output?old.source:value;
      const output=language==='en'?translate(source):source;
      entries[name]={source,output};attributeOriginals.set(el,entries);if(value!==output)el.setAttribute(name,output);
    }
  }
  function apply(){
    document.documentElement.lang=language;localize();localize(document.querySelector('title'));
    const selector=document.getElementById('language-select');if(selector)selector.value=language;
  }
  window.StackI18n={get language(){return language;},translate,localize:apply,setLanguage(value){
    language=value==='en'?'en':'ko';try{localStorage.setItem('nonogram-stack-language',language);}catch{}
    apply();dispatchEvent(new Event('stack-language-change'));
  }};
  let scheduled=false;
  new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;apply();});}).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title']});
  apply();
})();
