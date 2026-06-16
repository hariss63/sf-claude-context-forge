/**
 * ProjectTriggerHandler_Test
 * Unit tests for ProjectTriggerHandler.
 * Target coverage: 90%+
 */
@isTest
private class ProjectTriggerHandler_Test {

    @TestSetup
    static void makeData() {
        Account__c supplier = new Account__c(
            Name = 'Test Supplier',
            IsActive__c = true
        );
        insert supplier;
    }

    @isTest
    static void testInsertSetsDefaultStatus() {
        Project__c proj = new Project__c(Name = 'New Project');
        insert proj;

        Project__c result = [SELECT Status__c FROM Project__c WHERE Id = :proj.Id];
        System.assertEquals('Draft', result.Status__c, 'Default status should be Draft');
    }

    @isTest
    static void testStatusTransitionToCompleted() {
        Project__c proj = new Project__c(Name = 'Transition Project', Status__c = 'In Progress');
        insert proj;

        proj.Status__c = 'Completed';
        update proj;

        Project__c result = [SELECT Status__c FROM Project__c WHERE Id = :proj.Id];
        System.assertEquals('Completed', result.Status__c, 'Status should be Completed');
    }

    @isTest
    static void testCannotChangeTerminalStatus() {
        Project__c proj = new Project__c(Name = 'Terminal Project', Status__c = 'Completed');
        insert proj;

        proj.Status__c = 'In Progress';
        try {
            update proj;
            System.assert(false, 'Expected exception not thrown');
        } catch (DmlException e) {
            System.assert(
                e.getMessage().contains('Cannot change status'),
                'Error message should explain terminal status restriction'
            );
        }
    }
}
