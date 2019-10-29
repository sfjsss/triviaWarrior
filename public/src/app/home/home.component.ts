import { Component, OnInit } from '@angular/core';
import { HttpService } from '../http.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  createRoomFormShow = false;
  joinRoomFormShow = false;
  notification = "";

  constructor(private _webSocketService: HttpService) { }

  ngOnInit() {
    this._webSocketService.listen("greeting").subscribe(data => {
      console.log(data);
    })

    this._webSocketService.listen("kickOutReason").subscribe((data: any) => {
      this.notification = data;
    })

    this._webSocketService.listen("sendHomeAnswer").subscribe((msg: any) => {
      this.notification = msg;
    })
  }

  createRoomFormInitialize() {
    this.createRoomFormShow = true;
  }

  joinRoomFormInitialize() {
    this.joinRoomFormShow = true;
  }

}
