import { Component, OnInit } from '@angular/core';
import { Router } from "@angular/router";
import { HttpService } from '../http.service';

@Component({
  selector: 'app-create-room',
  templateUrl: './create-room.component.html',
  styleUrls: ['./create-room.component.css']
})
export class CreateRoomComponent implements OnInit {

  createRoomForm = {};
  errors = "";

  constructor(
    private _router: Router,
    private _webSocketService: HttpService
    ) { }

  ngOnInit() {
    this.createRoomForm = {
      roomName: "",
      userName: ""
    }

    this._webSocketService.listen("createdRoom").subscribe((data: any) => {
      if (data.created) {
        this._router.navigate([`/room/${this.createRoomForm["roomName"]}`]);
      }
      else {
        this.errors = data.message;
      }
    })
  }

  createRoom() {
    this._webSocketService.emit("createRoom", {
      roomName: this.createRoomForm["roomName"],
      userName: this.createRoomForm["userName"]
    });
  }

}
