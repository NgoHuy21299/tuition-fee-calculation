demo data csv

```
,Câu khen,,Câu BTVN,,Câu dạng bài làm tốt,,Câu dạng bài chưa làm tốt,Câu kết,,Nhận xét
Tên bài thi: Bài thi giữa học kỳ 1,Con {Tên học sinh} hăng hái phát biểu và tham gia tích cực các hoạt động học tập trên lớp,"Con {Tên học sinh} trả lời tốt các câu hỏi của cô trong giờ học, con hãy hăng hái phát biểu hơn nữa nhé.",Con có ý thức học tốt và hoàn thành đầy đủ BTVN cô giao,Con cần chăm chỉ hơn trong việc hoàn thành BTVN để củng cố kiến thức nhé,"Trong bài thi {Tên bài thi}, con làm tốt các dạng bài: {Các dạng bài làm tốt}",,Con cần ôn tập và rèn luyện thêm về: {Các dạng bài làm chưa tốt},"Cô tin rằng con sẽ phát huy điểm mạnh của mình, cẩn thận hơn khi làm bài và chinh phục được thật nhiều điểm tốt con nhé.",Cô tin rằng con sẽ cẩn thận hơn khi làm bài và có bứt phá trong thời gian tới nhé.,
Tên học sinh,Tốt,Chưa tốt,Tốt,Chưa tốt,Điền đáp án,Bài toán có lời văn,,Tốt,Chưa tốt,
Đức Trí,x,,,x,x,,,,x,
Văn Toàn,x,,x,,x,x,,x,,
```

Requirement:
Hãy đọc bảng tính, bây giờ tôi cần một chức năng merge các nhận xét này. Để tôi mô tả về cách hoạt động trước
- Ở dòng đầu tiên là những phần của một nhận xét. Ví dụ trong file excel hiện tại thì có 4 phần: Câu khen, Câu btvn, Câu dạng bài làm tốt, Câu dạng bài làm chưa tốt, Câu kết.
- Ở dòng thứ hai: Phần mẫu câu tương ứng với phần nhận xét bên trên. Có phần cần để ý hơn là ở F2, trong phần đó có {Tên bài thi} thì sẽ ghép với Tên bài thi ở ô A2 (lấy dữ liệu và trim space nếu có). Ô B2, C2 cũng tương tự có phần placeholder là {Tên học sinh} thì là ở cột A, lấy từ dòng số 4 trong file excel, nhưng có một cách khác để xác định là tìm ô Tên học sinh trong cột A, sau đó từ dưới ô đó trở đi là tên học sinh.
- Ở dòng thứ 3: Là các biến để cung cấp thêm thông tin, về cơ bản thì chỉ cần để ý đến Phần 'Câu dạng bài làm tốt' trở đi. Cách tìm kiếm ở đây là tìm kiếm ở dòng 1 'Câu dạng bài làm tốt' (ví dụ trong file là F1), sau đó ở dưới 2 ô (ví dụ là F3) thì là bắt đầu của phần các dạng bài. Nó sẽ tiếp tục đến G3, H3, ... nếu có. Điều kiện dừng lại là tìm kiếm ở dòng 1 ô `Câu dạng bài chưa làm tốt` ra cột nào thì sẽ dừng trước đó. Ví dụ trong file là ô `Câu dạng bài chưa làm tốt` sẽ ở H1 vậy thì các dạng bài sẽ dừng ở G3.
- Ở dòng thứ 4: là bắt đầu cần xử lý các records là các học sinh, nhưng nên sử dụng cách tìm kiếm ô 'Tên học sinh' và từ dưới đó trở đi là các records thì sẽ chính xác hơn là hardcode dòng 4.
	+ Cột A: Tên học sinh => cần thay thế vào các placeholder tương ứng {Tên học sinh}. Chú ý tên các biến thì lower case hết để đảm bảo không sensitive case.
	+ Từ cột B trở đi (Sau cột tên học sinh, ngoại trừ các phần 'Câu dạng bài làm tốt/chưa làm tốt') là các data cần phải xử lý. Được đánh bằng dấu 'x' (chú ý lower hết để tránh sensitive case). Logic xử lý của phần này như sau:
		- Nếu đánh dấu x thì sẽ dóng lên trên ở hàng 2, lấy mẫu câu đó. Nếu có placeholder thì phải điền vào.
		- Validation: Ở trong cùng một phần ví dụ như 'Câu khen' thì ở dòng 3 có định nghĩa 'Tốt'/'Chưa tốt' thì dấu x chỉ được đánh vào một trong hai ô. Nếu có đánh vào thì bị báo lỗi chẳng hạn.
	+ Với phần đặc biệt như 'Câu dạng bài làm tốt'/'Câu dạng bài chưa làm tốt'.
		- Ở dòng số 3 có các dạng bài như 'Điền đáp án', 'Bài toán có lời văn', .... (chú ý điều kiện tìm kiếm các ô này tôi đã đề cập bên trên - dựa vào 'Câu dạng bài làm tốt'). Nếu học sinh được đánh dấu x vào các cột tương ứng nào, ví dụ như đánh x vào 'Điền đáp án' => sẽ cần ghép các phần được đánh dấu x này vào câu mẫu (ở dòng 2) vào placeholder {Các dạng bài làm tốt}. Khi có nhiều dạng bài làm tốt thì sẽ ngăn cách nhau bằng dấu phẩy.
		- Với những dạng bài không được đánh dấu x thì mặc định là làm chưa tốt, lúc này sẽ cần phải ghép sang câu mẫu của 'Câu dạng bài chưa làm tốt' vào placeholder {Các dạng bài làm chưa tốt}.
			+ Chú ý với phần các dạng bài này thì khi ghép vào sẽ không viết hoa. Ví dụ người dùng chọn Điền đáp án, Bài toán có lời văn => ... các dạng bài: điền đáp án, bài toán có lời văn.
	+ Sau khi xử lý xong dữ liệu của từng phần nhận xét, cuối cùng là ghép lại thành câu nhận xét hoàn chỉnh. Thứ tự sẽ theo thứ tự của dòng 1, ví dụ như trong file là Câu khen -> Câu BTVN -> Câu dạng bài làm tốt -> Câu dạng bài làm chưa tốt -> câu kết. Nhận xét được điền vào cột 'Nhận xét' ví dụ trong file là K1.
- Note:
	+ Ngoài logic chính ra thì việc tìm dòng tên học sinh cũng quan trọng (dòng dưới so với dòng 'Tên học sinh') vì tôi tính toán có thể người dùng muốn thêm nhiều mẫu câu để câu nhận xét đa dạng hơn tránh bị lặp lại quá nhiều.
	+ Các phần thông tin như dạng bài, tốt, chưa tốt thì sẽ nằm cùng dòng với dòng chứa 'Tên học sinh' (ví dụ trong file là dòng 3) vì sau này khi thêm nhiều mẫu câu thì sẽ có thể bị đẩy xuống nhiều hơn.
	+ Sau mỗi một phần cần phải có dấu '.', nếu người dùng đã thêm dấu chấm vào trong câu mẫu rồi thì sẽ không cần tự thêm dấu chấm vào nữa.
    + Chỉ implement phía client (frontend) tôi không muốn file được load về server để xử lý vì dung lượng xử lý cơ bản là rất nhỏ. 
	+ Khi thực hiện chú ý comment đầy đủ, clean, solid code,... để dễ maintain sau này.