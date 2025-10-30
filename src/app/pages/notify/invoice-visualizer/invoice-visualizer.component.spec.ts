import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceVisualizerComponent } from './invoice-visualizer.component';

describe('InvoiceVisualizerComponent', () => {
  let component: InvoiceVisualizerComponent;
  let fixture: ComponentFixture<InvoiceVisualizerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoiceVisualizerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvoiceVisualizerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
