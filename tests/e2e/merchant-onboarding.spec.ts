import {test,expect} from '@playwright/test';
test('new onboarding deliberately saves details, resumes, and disappears after completion',async({page})=>{
 await page.goto('/merchant');const start=page.getByRole('button',{name:'Get Started',exact:true});await start.click();const dialog=page.getByRole('dialog');
 const name=dialog.getByLabel('Restaurant name',{exact:true});const original=await name.inputValue();await name.fill('Unfinished name');await dialog.getByLabel('Contact email',{exact:true}).fill('unfinished@example.com');await dialog.getByRole('button',{name:'Close dialog',exact:true}).click();
 await page.reload();await start.click();await expect(name).toHaveValue(original);
 await name.fill('Deliberately saved demo');await dialog.getByLabel('Contact email',{exact:true}).fill('demo@example.com');await dialog.getByRole('button',{name:'Save & Continue',exact:true}).click();
 await expect(dialog.getByRole('heading',{name:'Your Menu',exact:true})).toBeVisible();await expect(dialog.getByRole('button',{name:'Import Menu',exact:true})).toBeVisible();await expect(dialog.getByRole('button',{name:'Add a Dish',exact:true})).toBeVisible();await dialog.getByRole('button',{name:'Close dialog',exact:true}).click();
 await page.reload();await page.getByRole('button',{name:'Continue Setup',exact:true}).click();await expect(dialog.getByRole('heading',{name:'Your Menu',exact:true})).toBeVisible();await dialog.getByRole('button',{name:'Continue',exact:true}).click();await expect(dialog.getByText('Deliberately saved demo',{exact:true})).toBeVisible();await dialog.getByRole('button',{name:'Continue',exact:true}).click();await dialog.getByRole('button',{name:'Go to Home',exact:true}).click();
 await expect(dialog).toHaveCount(0);await expect(page.getByRole('region',{name:'Quick Actions',exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('region',{name:'Restaurant onboarding',exact:true})).toHaveCount(0);
 await page.getByRole('navigation',{name:'Merchant navigation'}).getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByRole('button',{name:'Review Setup',exact:true})).toHaveCount(0);await expect(page.getByLabel('Restaurant name',{exact:true})).toHaveValue('Deliberately saved demo');await expect(page.getByRole('button',{name:'Save Changes',exact:true})).toBeDisabled();
});
