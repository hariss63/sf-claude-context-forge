import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import getActiveProjects from '@salesforce/apex/ProjectService.getActiveProjectsForAccount';

import NAME_FIELD from '@salesforce/schema/Account__c.Name';
import ISACTIVE_FIELD from '@salesforce/schema/Account__c.IsActive__c';

const FIELDS = [NAME_FIELD, ISACTIVE_FIELD];

export default class ProjectSummary extends LightningElement {
    @api recordId;

    projects = [];
    error;

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    account;

    @wire(getActiveProjects, { accountId: '$recordId' })
    wiredProjects({ data, error }) {
        if (data) {
            this.projects = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.projects = [];
        }
    }

    get accountName() {
        return getFieldValue(this.account.data, NAME_FIELD);
    }

    get isActive() {
        return getFieldValue(this.account.data, ISACTIVE_FIELD);
    }

    get hasProjects() {
        return this.projects && this.projects.length > 0;
    }

    get projectCount() {
        return this.projects ? this.projects.length : 0;
    }
}
