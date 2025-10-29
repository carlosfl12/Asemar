import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReceiverPage } from './receiver.page';

describe('ReceiverPage', () => {
  let component: ReceiverPage;
  let fixture: ComponentFixture<ReceiverPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReceiverPage]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ReceiverPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
