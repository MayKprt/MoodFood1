import {test,expect} from '@playwright/test';
for (const width of [1180,820,390]) {
 test(`in-progress order layout stays balanced at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:820});
  await page.goto('/merchant');
  await page.getByRole('navigation',{name:'Merchant navigation'}).getByRole('button',{name:/^Orders/}).click();
  await page.getByRole('button',{name:/^In Progress/}).click();
  const card=page.getByRole('article').filter({has:page.getByRole('heading',{name:'Order #1047',exact:true})});
  const title=(await card.getByRole('heading').boundingBox())!;
  const primary=card.getByRole('button',{name:'Mark Ready',exact:true});
  const action=(await primary.boundingBox())!;
  const contact=card.getByRole('button',{name:'Contact Customer',exact:true});
  await expect(contact).toBeVisible();
  expect(await card.locator('details').getAttribute('open')).toBeNull();
  if(width>=760){expect(action.x).toBeGreaterThan(title.x+150);expect(action.width).toBeGreaterThanOrEqual(220);expect(action.width).toBeLessThanOrEqual(280);}
  else {expect(action.y).toBeGreaterThan(title.y);expect(action.width).toBeGreaterThan(240);}
  await contact.click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
  await card.getByRole('button',{name:'Report Delay',exact:true}).click();await expect(page.getByRole('dialog').getByText('Demo only · No messages or calls leave this browser.')).toBeVisible();await page.keyboard.press('Escape');
  await primary.click();await expect(card.getByRole('button',{name:'Complete Order',exact:true})).toBeVisible();
  await card.getByText('Delivery Details',{exact:true}).click();await expect(card.getByText('Demo pickup · Delivery provider not connected.')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}
