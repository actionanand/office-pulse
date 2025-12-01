import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { AttendanceStateService } from './services/attendance-state.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected title = 'Office Pulse';
  private attendanceState = inject(AttendanceStateService);

  ngOnInit(): void {
    // Fetch attendance data on app load
    this.attendanceState.fetchAttendanceData();
  }
}
