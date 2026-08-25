  // 가게부 내역을 담는 배열 만들기
  var transactions = JSON.parse(localStorage.getItem('donmoa') || '[]');
  // 브라우저 저장소에서 donmoa 라는 이름으로 저장된 데이터를 가져옴
  // 데이터가 없으면 [] 로 시작하게 하기
  // ( JSON.parse() : 저장된 데이터를 다시 JavaScript 배열로 바꿔준다. 문자열임 )

  // 날짜 입력칸에 오늘의 날짜를 자동으로 넣는 코드
  // toISOString() 하면 2026-05-04T03:12:30.000Z 이런식으로 나옴 그렇기에 slice를 해준다.
  document.getElementById('dateInput').value = new Date().toISOString().slice(0, 10);

  // 메뉴를 눌렀을 때 화면을 바꿔주는 함수
  function showSection(name, el) {
    // jQuery 문법
    // id 가 section- 으로 시작하는 모든 요소를 숨겨라
    $('[id^="section-"]').hide();

    // 선택한 섹션만 다시 보여준다.
    // ex) name = "home" 이면 
    /// $('#section-home').show()
    $('#section-' + name).show();

    // 사이드바 메뉴의 선택 표시 바꾸는 코드
    // 기존 메뉴의 active 표시 지우고 지금 클릭한 메뉴에만 active를 붙임
    $('.sidebar li').removeClass('active');
    $(el).addClass('active');
  }

  // 내역을 추가하는 함수 ( 수입 / 지출 내역을 추가 )
  function addTransaction() {
    
    // 화면의 입력 값들을 가져온다.
    var type     = $('#typeSelect').val();            // 수입인가 지출인가
    var category = $('#categorySelect').val();        // 카테고리
    var desc     = $('#descInput').val();             // 내용
    var amount   = parseInt($('#amountInput').val()); // 금액
    var date     = $('#dateInput').val();             // 날짜

    // 입력 값 검사
    if (!desc) { alert('내용을 입력해주세요.'); return; }
    if (!amount || amount <= 0) { alert('금액을 입력해주세요.'); return; }


    // 새로운 내역을 만들기
    // 입력한 값을 하나의 객체로 만든다.
    var newItem = {
      id: Date.now(), // 시간을 고유 번호로 쓴다.
      type: type,
      category: category,
      desc: desc,
      amount: amount,
      date: date
    };

    // 배열에 추가
    transactions.push(newItem);
    // 브라우저 저장소에 저장 ( localStorage는 배열을 저장할 수 없어 JSON.stringify로 문자열로 바꿔 저장 )
    localStorage.setItem('donmoa', JSON.stringify(transactions));


    // 입력 값 지우기 (내용 , 금액 )
    $('#descInput').val('');
    $('#amountInput').val('');

    alert('추가되었습니다!');

    // 화면 다시 그리기
    render();
  }

  // 내역을 삭제하는 함수
  function deleteTransaction(id) {
    if (!confirm('삭제할까요?')) return;
    
    // 
    transactions = transactions.filter(function(t) { return t.id !== id; });
    localStorage.setItem('donmoa', JSON.stringify(transactions));
    render();
  }

  // ===== 렌더링 =====
  function render() {
    var income = 0;
    var expense = 0;

    for (var i = 0; i < transactions.length; i++) {
      if (transactions[i].type === 'income') {
        income += transactions[i].amount;
      } else {
        expense += transactions[i].amount;
      }
    }

    // 요약 업데이트 (jQuery)
    $('#totalIncome').text(income.toLocaleString() + '원');
    $('#totalExpense').text(expense.toLocaleString() + '원');
    $('#totalBalance').text((income - expense).toLocaleString() + '원');

    // 배지 업데이트 (절대 좌표 배지)
    $('#txBadge').text(transactions.length);

    // 내역 HTML 생성
    var html = '';
    if (transactions.length === 0) {
      html = '<div class="empty">아직 내역이 없습니다.</div>';
    } else {
      var sorted = transactions.slice().sort(function(a, b) {
        return new Date(b.date) - new Date(a.date);
      });

      for (var j = 0; j < sorted.length; j++) {
        var t = sorted[j];
        var sign  = t.type === 'income' ? '+' : '-';
        var color = t.type === 'income' ? '#2ecc71' : '#e74c3c';

        html += '<div class="tx-item">';
        html += '  <div>';
        html += '    <div class="tx-desc">[' + t.category + '] ' + t.desc + '</div>';
        html += '    <div class="tx-meta">' + t.date + '</div>';
        html += '  </div>';
        html += '  <div class="tx-right">';
        html += '    <span style="color:' + color + ';font-weight:bold;">' + sign + t.amount.toLocaleString() + '원</span>';
        html += '    <button class="del-btn" onclick="deleteTransaction(' + t.id + ')">✕</button>';
        html += '  </div>';
        html += '</div>';
      }
    }

    // 홈 최근 내역 (최대 5개)
    if (transactions.length === 0) {
      $('#recentList').html('<div class="empty">아직 내역이 없습니다.</div>');
    } else {
      var recent = transactions.slice().sort(function(a, b) {
        return new Date(b.date) - new Date(a.date);
      }).slice(0, 5);

      var recentHtml = '';
      for (var k = 0; k < recent.length; k++) {
        var r = recent[k];
        var rs = r.type === 'income' ? '+' : '-';
        var rc = r.type === 'income' ? '#2ecc71' : '#e74c3c';
        recentHtml += '<div class="tx-item">';
        recentHtml += '  <div><div class="tx-desc">[' + r.category + '] ' + r.desc + '</div>';
        recentHtml += '  <div class="tx-meta">' + r.date + '</div></div>';
        recentHtml += '  <span style="color:' + rc + ';font-weight:bold;">' + rs + r.amount.toLocaleString() + '원</span>';
        recentHtml += '</div>';
      }
      $('#recentList').html(recentHtml);
    }

    $('#txList').html(html);
  }

  // ===== 음악 재생 (오디오 - 평가요소 8번) =====
  function playMusic(type) {
    var audio = document.getElementById('audioPlayer');
    var files = {
      'lofi': 'lofi.mp3',
      'nature': 'nature.mp3',
      'rain': 'rain.mp3'
    };
    audio.src = files[type];
    audio.volume = 0.2;
    audio.play().catch(function() {
      alert('음악 파일이 없습니다. 같은 폴더에 ' + files[type] + ' 파일을 넣어주세요.');
    });

    $('.music-btn').removeClass('playing');
    // jQuery로 클릭된 버튼 강조
    $('.music-btn').filter(function() {
      return $(this).text().indexOf(type === 'lofi' ? 'Lo-fi' : type === 'nature' ? '자연' : '빗소리') > -1;
    }).addClass('playing');
  }

  function stopMusic() {
    var audio = document.getElementById('audioPlayer');
    audio.pause();
    audio.currentTime = 0;
    $('.music-btn').removeClass('playing');
  }

  // 초기 렌더링
  render();
