import {test,expect} from '@playwright/test';
test('all order tabs share the In Progress grid and retain unique actions',async({page,isMobile})=>{
 await page.setViewportSize({width:isMobile?390:1180,height:820});await page.goto('/merchant');await page.getByRole('navigation',{name:'Merchant navigation'}).getByRole('button',{name:/^Orders/}).click();
 const tabs=page.getByRole('group',{name:'Order categories'});
 const attention=page.getByRole('article').filter({has:page.getByRole('heading',{name:'Order #1048',exact:true})});
 const accept=attention.getByRole('button',{name:'Accept Order',exact:true});const secondary=attention.getByRole('button',{name:'Decline Order',exact:true});
 const a=(await accept.boundingBox())!;const b=(await secondary.boundingBox())!;expect(b.x).toBeCloseTo(a.x,0);expect(b.width).toBeCloseTo(a.width,0);expect(b.y).toBeGreaterThan(a.y);
 const referenceClass=await attention.getAttribute('class');
 await secondary.click();await page.getByRole('dialog').getByRole('button',{name:'Keep Order',exact:true}).click();await accept.click();
 await tabs.getByRole('button',{name:/^In Progress/}).click();const ready=page.getByRole('article').filter({has:page.getByRole('heading',{name:'Order #1046',exact:true})});
 expect(await ready.getAttribute('class')).toBe(referenceClass);const complete=ready.getByRole('button',{name:'Complete Order',exact:true});const c=(await complete.boundingBox())!;expect(c.width).toBeCloseTo(a.width,0);
 await complete.click();await tabs.getByRole('button',{name:/^Completed/}).click();expect(await ready.getAttribute('class')).toBe(referenceClass);
 const reopen=ready.getByRole('button',{name:'Reopen Order',exact:true});const r=(await reopen.boundingBox())!;expect(r.width).toBeCloseTo(a.width,0);expect(r.x).toBeCloseTo(a.x,0);
 await expect(ready.getByText('Sophie L. · $23.00',{exact:true})).toBeVisible();
 await ready.getByText('Delivery Details',{exact:true}).click();await expect(ready.getByText('Demo pickup · Delivery provider not connected.')).toBeVisible();
 await reopen.click();await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();await expect(reopen).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
