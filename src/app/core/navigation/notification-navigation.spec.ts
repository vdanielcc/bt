import {Subject,of} from 'rxjs';
import {NavigationLoaderService} from './navigation-loader.service';
import {NavigationItem} from './navigation-item.interface';
describe('Navegación de notificaciones por permisos',()=>{
 const flatten=(items:NavigationItem[]):string[]=>items.flatMap(i=>'children' in i?flatten(i.children):typeof i.route==='string'?[i.route]:[]);
 function setup(){const grade=new Subject<any>(),notification=new Subject<any>();const session={rol:'academy_admin',academieId:2};const auth={getCurrentUser:()=>session,currentUser$:new Subject()};const nav=new NavigationLoaderService({} as any,{language$:of('es'),translate:(s:string)=>s} as any,{capabilities:()=>grade} as any,auth as any,{capabilities:()=>notification} as any);let paths:string[]=[];nav.items$.subscribe(i=>paths=flatten(i));return{grade,notification,paths:()=>paths};}
 it('una respuesta tardía de grados no borra el menú de notificaciones',()=>{const s=setup();s.notification.next({permissions:['notification.delivery.view','notification.view'],academies:[{id:2,name:'Dojo'}]});s.notification.complete();s.grade.next({permissions:['grading.student.view'],academyIds:[2],studentIds:[],academies:[{id:2,name:'Dojo'}]});s.grade.complete();expect(s.paths()).toContain('/academies/2/grading');expect(s.paths()).toContain('/academies/2/notifications');expect(s.paths()).toContain('/mi-cuenta/notifications');});
 it('rol Director sin permiso concreto no conserva enlace estático de notificaciones',()=>{const s=setup();s.grade.next({permissions:[],academyIds:[],studentIds:[]});s.grade.complete();s.notification.next({permissions:[],academies:[]});s.notification.complete();expect(s.paths()).not.toContain('/academies/2/notifications');expect(s.paths()).not.toContain('/mi-cuenta/notifications');});
});
