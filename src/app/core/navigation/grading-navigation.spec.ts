import {BehaviorSubject,of} from 'rxjs';
import {NavigationLoaderService} from './navigation-loader.service';
import {NavigationItem} from './navigation-item.interface';
describe('Menú de grados desde permisos API',()=>{
 function routes(items:NavigationItem[]):string[]{return items.flatMap(i=>'children' in i?routes(i.children):typeof i.route==='string'?[i.route]:[]);}
 function navigation(permissions:string[],personal=false){
  const session={rol:personal?'alumno':'instructor',academieId:0};const auth={getCurrentUser:()=>session,currentUser$:new BehaviorSubject(session)};
  const grading={capabilities:()=>of({permissions,academyIds:[2],studentIds:personal?[8]:[],academies:[{id:2,name:'Dojo'}],students:[{id:8,name:'Ana'}]})};
  const service=new NavigationLoaderService({} as any,{language$:of('es'),translate:(x:string)=>x} as any,grading as any,auth as any,{capabilities:()=>of({permissions:[],academies:[]})} as any);let output:NavigationItem[]=[];service.items$.subscribe(items=>output=items);return routes(output);
 }
 it('Instructor recibe enlace de academia cuando la API concede lectura',()=>{expect(navigation(['grading.student.view'])).toContain('/academies/2/grading');});
 it('rol sin permiso concreto no muestra enlace de grados',()=>{expect(navigation([])).not.toContain('/academies/2/grading');});
 it('Student obtiene enlace personal con permisos de lectura',()=>{expect(navigation(['grading.student.view'],true)).toContain('/mi-cuenta/grading');});
});
