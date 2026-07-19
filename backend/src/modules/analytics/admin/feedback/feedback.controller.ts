import { Request, Response, NextFunction } from "express";
import { prisma } from "../../../../config/database";
import { CaseStatus } from "../../../../../generated/prisma/client";


export const getCaseFeedbackAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalClosedCases, casesWithFeedback] = await prisma.$transaction([
      prisma.caseReport.count({
        where: { status: CaseStatus.CLOSED }
      }),
      prisma.caseReport.count({
        where: {
          status: CaseStatus.CLOSED,
          OR: [
            { customerFeedback: { not: null } },
            { feedback: { not: null } }
          ] as any
        }
      })
    ]);

    const trackingRecords = await prisma.caseReport.findMany({
      where: {
        status: CaseStatus.CLOSED,
        OR: [
          { customerFeedback: { not: null } },
          { feedback: { not: null } }
        ] as any
      },
      select: {
        id: true,
        caseNumber: true,
        subject: true,
        resolvedAt: true,
        closedAt: true,
        customerFeedback: true,
        rating: true, 
        assignedSupport: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      } as any,
      orderBy: { closedAt: "desc" }
    });

    let totalRatingSum = 0;
    let scoredReviewsCount = 0;
    
    const feedbackList = trackingRecords.map((record: any) => {
      if (record.rating && typeof record.rating === "number") {
        totalRatingSum += record.rating;
        scoredReviewsCount++;
      }

      return {
        caseId: record.id,
        caseNumber: record.caseNumber,
        subject: record.subject,
        closedAt: record.closedAt || record.resolvedAt,
        assignedAgent: record.assignedSupport 
          ? `${record.assignedSupport.firstName} ${record.assignedSupport.lastName}`
          : "Unassigned / Automated System",
        rating: record.rating || "No Score Provided",
        comment: record.customerFeedback || record.feedback || ""
      };
    });

    const feedbackSubmissionRate = totalClosedCases > 0 
      ? parseFloat(((casesWithFeedback / totalClosedCases) * 100).toFixed(2)) 
      : 0;

    const averageCustomerScore = scoredReviewsCount > 0 
      ? parseFloat((totalRatingSum / scoredReviewsCount).toFixed(2)) 
      : null;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalClosedCases,
          casesWithFeedbackReceived: casesWithFeedback,
          feedbackSubmissionRatePercentage: feedbackSubmissionRate,
          averageSatisfactionScore: averageCustomerScore 
        },
        reviews: feedbackList
      }
    });
  } catch (error) {
    next(error);
  }
};