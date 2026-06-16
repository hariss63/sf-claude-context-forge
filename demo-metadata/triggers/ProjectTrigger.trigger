/**
 * ProjectTrigger
 * Single trigger for Project__c. All logic delegated to ProjectTriggerHandler.
 */
trigger ProjectTrigger on Project__c (
    before insert,
    before update,
    after update
) {
    if (Trigger.isBefore) {
        if (Trigger.isInsert) {
            ProjectTriggerHandler.handleBeforeInsert(Trigger.new);
        }
        if (Trigger.isUpdate) {
            ProjectTriggerHandler.handleBeforeUpdate(Trigger.new, Trigger.oldMap);
        }
    }

    if (Trigger.isAfter) {
        if (Trigger.isUpdate) {
            ProjectTriggerHandler.handleAfterUpdate(Trigger.new, Trigger.oldMap);
        }
    }
}
