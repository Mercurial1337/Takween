-- ============================================================================
-- Takween Database Schema
-- Version: 013 — Update Graduation Project Description
-- Description: Updates the Graduation Project description with a bilingual text (English/Arabic)
-- ============================================================================

UPDATE projects 
SET description = 'The Graduation Project is your final capstone experience. This is your opportunity to form a diverse team, collaborate with talented peers, and build an innovative solution that showcases your collective skills.

مشروع التخرج هو تتويج لمسيرتك الأكاديمية. إنها فرصتك لتكوين فريق متكامل، والتعاون مع زملائك الموهوبين، وبناء حل مبتكر يعكس مهاراتكم المشتركة.'
WHERE title ILIKE 'Graduation Project%';
