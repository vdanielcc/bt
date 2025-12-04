import { Component, OnInit } from '@angular/core';
import { Form, FormBuilder, FormControl, FormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { fadeInUp400ms } from '../../../../../@vex/animations/fade-in-up.animation';

@Component({
  selector: 'vex-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
  animations: [fadeInUp400ms]
})
export class ForgotPasswordComponent implements OnInit {

  public simpleEmailPattern = '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$';

  form!: FormGroup;

  constructor(
    private router: Router,
    private fb: UntypedFormBuilder
  ) { }

  ngOnInit() {
    this.form = this.fb.group({
      email: [null, [Validators.required , Validators.pattern(this.simpleEmailPattern) ]]
    });
  }

  onSubmit() 
  {
    console.log('entro');


    alert('ADD \n\n' + 'function addAsignatura()' + JSON.stringify( this.form.value, null, 4));
    if(this.form.status === 'VALID'){
      console.log('llamar al servicio');
      alert('llamar al servicio');
      //this.router.navigate(['/']);
    } else {
      alert('No valido');
    }
  }
}
