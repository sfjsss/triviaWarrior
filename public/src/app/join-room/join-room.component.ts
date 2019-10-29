import { Component, OnInit } from '@angular/core';
import { Router } from "@angular/router";
import { HttpService } from '../http.service';

@Component({
  selector: 'app-join-room',
  templateUrl: './join-room.component.html',
  styleUrls: ['../create-room/create-room.component.css']
})
export class JoinRoomComponent implements OnInit {

  joinRoomForm = {};
  errors = "";

  constructor(
    private _router: Router,
    private _webSocketService: HttpService
  ) { }

  ngOnInit() {
    this.joinRoomForm = {
      roomName: "",
      userName: ""
    }

    this._webSocketService.listen("joinedRoom").subscribe((data: any) => {
      if (data.joined) {
        this._router.navigate([`/room/${this.joinRoomForm["roomName"]}`]);
      }
      else {
        this.errors = data.message;
      }
    })
  }

  joinRoom() {
    this._webSocketService.emit("joinRoom", {
      roomName: this.joinRoomForm["roomName"],
      userName: this.joinRoomForm["userName"]
    });
  }

}
