import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DialogoConfirmacionComponent } from './ui/dialogo-confirmacion.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DialogoConfirmacionComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
