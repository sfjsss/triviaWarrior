import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { HttpService } from '../http.service';

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.css']
})
export class RoomComponent implements OnInit {
  roomName = "--";
  ownerName = "--";
  challengerName = "--";
  selectedCategory = "9";
  cards: any[];
  ownerScore = 0;
  challengerScore = 0;
  status = "waiting for a challenger";
  answering = false;
  winner = "";

  constructor(
    private _route: ActivatedRoute,
    private _webSocketService: HttpService,
    private _router: Router
  ) { }

  ngOnInit() {
    this._route.params.subscribe((params: Params) => {
      this.roomName = params.roomName;
    });

    this._webSocketService.emit("ownerNameQuery", this.roomName);
    this._webSocketService.listen("ownerName").subscribe((data: any) => {
      this.ownerName = data;
    });

    this._webSocketService.listen("challengerJoined").subscribe((data: any) => {
      this.challengerName = data;
      this.status = "waiting for players to get ready"
    });

    this._webSocketService.listen("challengerLeft").subscribe((data: any) => {
      this.challengerName = "--";
      this.status = "waiting for a challenger";
      this.cards = [];
      this.ownerScore = 0;
      this.challengerScore = 0;
    });

    this._webSocketService.listen("closeRoom").subscribe((data: any) => {
      this._webSocketService.emit("roomCloseReason", "ask why room is closed");
      this._router.navigate(["/"]);
    });

    this._webSocketService.listen("opponentReady").subscribe((msg: any) => {
      if (this.status == "waiting for opponent to get ready") {
        this._webSocketService.emit("gameStart", this.roomName);
      }
      else {
        this.status = "waiting for you to get ready";
      }
    });

    this._webSocketService.listen("selectCategories").subscribe((msg: any) => {
      this.status = "waiting for players to select";
    });

    this._webSocketService.listen("opponentSelected").subscribe((msg: any) => {
      if (this.status == "waiting for opponent to select") {
        this._webSocketService.emit("gameOn", this.roomName);
      }
      // else {
      //   this.status = "waiting for players to select";
      // }
    });

    this._webSocketService.listen("loadGame").subscribe((msg: any) => {
      this.status = msg;
    });

    this._webSocketService.listen("cards").subscribe((cards: any) => {
      this.cards = cards;
      this.status = "Battle Start";
    });

    this._webSocketService.listen("countDown").subscribe((time: any) => {
      this.status = `Time remain ${time}`;
    })

    this._webSocketService.listen("hideCard").subscribe((cardInfo: any) => {
      this.cards[cardInfo.index].hide = true;
    });

    this._webSocketService.emit("checkIdentity", "check the user identity");

    this._webSocketService.listen("sendHome").subscribe((msg: any) => {
      this._webSocketService.emit("sendHomeReason", "why am I sent home");
      this._router.navigate(["/"]);
    });

    this._webSocketService.listen("updateScore").subscribe((data: any) => {
      if (data.user == 0) {
        this.ownerScore = data.score;
      }
      else {
        this.challengerScore = data.score;
      }
    });

    this._webSocketService.listen("hideAnsweredCard").subscribe((index: any) => {
      this.cards[index].hide = true;
      this.answering = false;
    });

    this._webSocketService.listen("gameOver").subscribe((result: any) => {
      console.log(`user with index ${result} won`);
      if (result == 0) {
        this.winner = this.ownerName;
      }
      else if (result == 1) {
        this.winner = this.challengerName;
      }
      else {
        this.winner = "No one";
      }
      this.status = "Game set";
    });

    this._webSocketService.listen("timeOut").subscribe((result: any) => {
      this.answering = true;
      console.log(`user with index ${result} won`);
      if (result == 0) {
        this.winner = this.ownerName;
      }
      else if (result == 1) {
        this.winner = this.challengerName;
      }
      else {
        this.winner = "No one";
      }
      this.status = "Game set";
    })

    this._webSocketService.listen("newGame").subscribe((msg: any) => {
      this.cards = [];
      this.ownerScore = 0;
      this.challengerScore = 0;
      this.status = "waiting for players to get ready";
    });

    this._webSocketService.listen("confirmFlip").subscribe((cardIndex: any) => {
      this.cards[cardIndex].flip = true;
      this.answering = true;
    })


  }

  leaveRoom() {
    this._webSocketService.emit("leaveRoom", this.roomName);
    this._router.navigate(["/"]);
  }

  ready() {
    this._webSocketService.emit("ready", this.roomName);
    this.status = "waiting for opponent to get ready";
  }

  selectCategory() {
    this._webSocketService.emit("selectCategory", { category: this.selectedCategory, roomName: this.roomName });
    this.status = "waiting for opponent to select";
  }

  flipCard(card) {

    if (!this.answering) {
      this._webSocketService.emit("flipCard", {
        roomName: this.roomName,
        cardInfo: card
      })
    }
  }

  rematch() {
    this._webSocketService.emit("rematch", this.roomName);
  }
    

  

}
