import {
	Directive,
	Input,
	Output,
	ComponentRef,
	ViewContainerRef,
	EventEmitter,
	OnInit,
	ComponentFactoryResolver,
	SimpleChanges,
	OnChanges
} from '@angular/core';
import {DateTimePickerComponent} from './datetime-picker.component';
import {DateTime} from './datetime';

/**
 * To simplify the implementation, it limits the type if value to string only, not a date
 * If the given string is not a valid date, it defaults back to today
 */
@Directive({
	selector : '[datetime-picker], [ng2-datetime-picker]',
	providers: [DateTime],
	host     : {
		'(click)': 'showDatetimePicker($event)'
	}
})
export class DateTimePickerDirective implements OnInit, OnChanges {
	@Input('date-format')
	public dateFormat:string;
	@Input('date-only')
	public dateOnly:boolean;
	@Input('close-on-select')
	public closeOnSelect:string;

	@Input('value')
	public value:any;

	@Output('onValueChange')
	public valueChange:EventEmitter<Date> = new EventEmitter<Date>();

	private _value:Date;

	private _componentRef:ComponentRef<DateTimePickerComponent>;
	private _el:HTMLElement;
	private _datetimePicker:HTMLElement;

	private _keyEventListener = (e:KeyboardEvent):void => {
		if (e.keyCode === 27) { //ESC key
			this.hideDatetimePicker();
		}
	};

	public constructor (private _resolver:ComponentFactoryResolver,
						private _viewContainerRef:ViewContainerRef) {
		this._el = this._viewContainerRef.element.nativeElement;
	}

	public ngOnInit ():void {
		//wrap this element with a <div> tag, so that we can position dynamic elememnt correctly
		let wrapper            = document.createElement("div");
		wrapper.className      = 'ng2-datetime-picker';
		wrapper.style.display  = 'inline-block';
		wrapper.style.position = 'relative';
		this._el.parentElement.insertBefore(wrapper, this._el.nextSibling);
		wrapper.appendChild(this._el);

		this._registerEventListeners();
	}

	public ngOnChanges (changes:SimpleChanges):void {
		if (changes['value'] !== undefined) {
			let dateNgModel:Date;

			if (typeof this.value === 'string') {
				//remove timezone and respect day light saving time
				dateNgModel = this.dateFormat ?
					DateTime.momentParse('' + this.value) :
					DateTime.parse('' + this.value);
			}
			else if (this.value instanceof Date) {
				dateNgModel = this.value;
			}
			else {
				dateNgModel = new Date();
			}

			if (this.dateFormat) {
				this._el['value'] = DateTime.momentFormatDate(dateNgModel, this.dateFormat);
			}
			else {
				this._el['value'] = DateTime.formatDate(dateNgModel, this.dateOnly);
			}

			this._value = dateNgModel;

			this._initDate();
		}
	}

	public ngOnDestroy ():void {
		// add a click listener to document, so that it can hide when others clicked
		document.body.removeEventListener('click', this.hideDatetimePicker);
		this._el.removeEventListener('keyup', this._keyEventListener);

		if (this._datetimePicker) {
			this._datetimePicker.removeEventListener('keyup', this._keyEventListener);
		}
	}

	//show datetimePicker below the current element
	public showDatetimePicker () {
		this.hideDatetimePicker();

		let factory = this._resolver.resolveComponentFactory(DateTimePickerComponent);

		this._componentRef   = this._viewContainerRef.createComponent(factory);
		this._datetimePicker = this._componentRef.location.nativeElement;
		this._datetimePicker.addEventListener('keyup', this._keyEventListener);

		this._initDate();
		this._styleDatetimePicker();

		let component = this._componentRef.instance;

		component.changes.subscribe(changes => {
			let newNgModel = new Date(changes.selectedDate);
			newNgModel.setHours(parseInt(changes.hour, 10));
			newNgModel.setMinutes(parseInt(changes.minute, 10));

			if (this.dateFormat) {
				this._el['value'] = DateTime.momentFormatDate(newNgModel, this.dateFormat);
			}
			else {
				this._el['value'] = DateTime.formatDate(newNgModel, this.dateOnly);
			}

			this._value = newNgModel;

			this.valueChange.emit(newNgModel);
		});

		component.closing.subscribe(() => {
			if (this.closeOnSelect !== "false") {
				this.hideDatetimePicker();
			}
		});
	}

	public hideDatetimePicker ():void {
		if (this._componentRef) {
			this._componentRef.destroy();
			this._componentRef = undefined;
		}
	};

	private _initDate ():void {
		if (this._componentRef) {
			let component = this._componentRef.instance;
			component.initDateTime(this._value);
			component.dateOnly = this.dateOnly;
		}
	}

	private _registerEventListeners () {
		// add a click listener to document, so that it can hide when others clicked
		document.body.addEventListener('click', this.hideDatetimePicker);
		this._el.addEventListener('keyup', this._keyEventListener);
	}

	private _styleDatetimePicker () {
		// setting width/height auto complete
		let thisElBCR                         = this._el.getBoundingClientRect();
		this._datetimePicker.style.width      = thisElBCR.width + 'px';
		this._datetimePicker.style.position   = 'absolute';
		this._datetimePicker.style.zIndex     = '1000';
		this._datetimePicker.style.left       = '0';
		this._datetimePicker.style.transition = 'height 0.3s ease-in';

		this._datetimePicker.style.visibility = 'hidden';

		setTimeout(() => {
			let thisElBcr           = this._el.getBoundingClientRect();
			let datetimePickerElBcr = this._datetimePicker.getBoundingClientRect();

			if (thisElBcr.bottom + datetimePickerElBcr.height > window.innerHeight) {
				// if not enough space to show on below, show above
				this._datetimePicker.style.bottom = '0';
			}
			else {
				// otherwise, show below
				this._datetimePicker.style.top = thisElBcr.height + 'px';
			}
			this._datetimePicker.style.visibility = 'visible';
		});

	};
}