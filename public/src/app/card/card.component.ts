import { Component, OnInit, Input} from '@angular/core';
import { HttpService } from '../http.service';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.css']
})


export class CardComponent implements OnInit{
  @Input() cardInfo: any;
  @Input() roomName: any;
  @Input() flip: any;
  answered = false;

  constructor(
    private _webSocketService: HttpService
  ) { }
  

  ngOnInit() {
  }

  checkAnswer(answer) {
    if (!this.answered) {
      this._webSocketService.emit("checkAnswer", {
        questionInfo: this.cardInfo,
        roomName: this.roomName,
        answer: answer
      })
      this.answered = true;
    }
  }
}
