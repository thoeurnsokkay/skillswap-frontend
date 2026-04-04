export interface User {
  id: number; name: string; email: string; role: 'USER' | 'ADMIN'
  bio?: string; avatarUrl?: string; location?: string; isActive?: boolean; createdAt: string
}
export interface Skill {
  id: number; userId: number; userName: string; skillName: string
  category: string; type: 'OFFERED' | 'WANTED'; level: string; moderationStatus?: 'PENDING' | 'ACTIVE' | 'ARCHIVED'; createdAt: string
}
export interface Match {
  id: number; user1: User; user2: User; skill1?: Skill; skill2?: Skill
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'; createdAt: string
}
export interface Message {
  id: number; matchId: number; sender: User; content: string; isRead: boolean; sentAt: string
}
export interface Review {
  id: number; reviewer: User; reviewee: User; matchId?: number; rating: number; comment: string; createdAt: string
}
export interface MatchSuggestion {
  user: User; theirOfferedSkills: Skill[]; theirWantedSkills: Skill[]; matchScore: number
}
export interface Resource {
  id: number
  matchId: number
  uploaderId: number
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: string
  createdAt: string
}

export interface CourseSummary {
  id: number
  creatorId: number
  creatorName: string
  title: string
  description?: string
  visibility: 'PUBLIC' | 'PRIVATE'
  lessonCount: number
  resourceCount: number
  createdAt: string
  updatedAt: string
}

export interface CourseLesson {
  id: number
  title: string
  description?: string
  videoName: string
  videoUrl: string
  positionOrder?: number
  createdAt: string
}

export interface CourseResource {
  id: number
  title?: string
  fileName: string
  fileUrl: string
  fileType?: string
  fileSize?: string
  createdAt: string
}

export interface CourseDetail {
  id: number
  creatorId: number
  creatorName: string
  title: string
  description?: string
  visibility: 'PUBLIC' | 'PRIVATE'
  createdAt: string
  updatedAt: string
  lessons: CourseLesson[]
  resources: CourseResource[]
}