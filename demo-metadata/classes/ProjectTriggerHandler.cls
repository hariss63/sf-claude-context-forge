/**
 * ProjectTriggerHandler
 * Handles all trigger events for the Project__c object.
 * Follows the single-trigger-per-object, handler-class pattern.
 */
public with sharing class ProjectTriggerHandler {

    public static void handleBeforeInsert(List<Project__c> newProjects) {
        setDefaultStatus(newProjects);
    }

    public static void handleBeforeUpdate(List<Project__c> newProjects, Map<Id, Project__c> oldMap) {
        validateStatusTransition(newProjects, oldMap);
    }

    public static void handleAfterUpdate(List<Project__c> newProjects, Map<Id, Project__c> oldMap) {
        List<Project__c> statusChanged = new List<Project__c>();
        for (Project__c proj : newProjects) {
            if (proj.Status__c != oldMap.get(proj.Id).Status__c) {
                statusChanged.add(proj);
            }
        }
        if (!statusChanged.isEmpty()) {
            ProjectService.notifyStatusChange(statusChanged);
        }
    }

    // ─── PRIVATE HELPERS ──────────────────────────────────────────────────

    private static void setDefaultStatus(List<Project__c> projects) {
        for (Project__c proj : projects) {
            if (String.isBlank(proj.Status__c)) {
                proj.Status__c = 'Draft';
            }
        }
    }

    private static void validateStatusTransition(
        List<Project__c> newProjects,
        Map<Id, Project__c> oldMap
    ) {
        Set<String> terminalStatuses = new Set<String>{ 'Completed', 'Cancelled' };
        for (Project__c proj : newProjects) {
            Project__c oldProj = oldMap.get(proj.Id);
            if (terminalStatuses.contains(oldProj.Status__c) &&
                oldProj.Status__c != proj.Status__c) {
                proj.Status__c.addError(
                    'Cannot change status of a ' + oldProj.Status__c + ' project.'
                );
            }
        }
    }
}
