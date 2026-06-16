/**
 * ProjectService
 * Service layer for Project__c business logic.
 * Called from trigger handlers and invocable actions.
 */
public with sharing class ProjectService {

    /**
     * Send notifications when project status changes.
     * Called from ProjectTriggerHandler.handleAfterUpdate.
     *
     * @param projects  List of Project__c records whose status changed
     */
    public static void notifyStatusChange(List<Project__c> projects) {
        List<Messaging.SingleEmailMessage> emails = new List<Messaging.SingleEmailMessage>();

        for (Project__c proj : projects) {
            if (proj.OwnerId == null) continue;

            Messaging.SingleEmailMessage msg = new Messaging.SingleEmailMessage();
            msg.setTargetObjectId(proj.OwnerId);
            msg.setSubject('Project Status Updated: ' + proj.Name);
            msg.setPlainTextBody(
                'The project "' + proj.Name + '" has been updated to status: ' + proj.Status__c + '.'
            );
            msg.setSaveAsActivity(false);
            emails.add(msg);
        }

        if (!emails.isEmpty() && !Test.isRunningTest()) {
            Messaging.sendEmail(emails);
        }
    }

    /**
     * Returns all active projects for a given supplier account.
     *
     * @param accountId  The Supplier Account Id
     * @returns          List of active Project__c records
     */
    public static List<Project__c> getActiveProjectsForAccount(Id accountId) {
        return [
            SELECT Id, Name, Status__c, StartDate__c
            FROM Project__c
            WHERE Account__c = :accountId
              AND Status__c NOT IN ('Completed', 'Cancelled')
            ORDER BY StartDate__c ASC NULLS LAST
        ];
    }
}
