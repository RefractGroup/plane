from django.urls import path
from .views import (
    SessionView,
    WorkView,
    TaskView,
    DocumentsView,
    FilesView,
    ManageView,
    CreatePortalView,
    ProjectPortalView,
    SignOutView,
)

urlpatterns = [
    path("project/<uuid:project_id>/", ProjectPortalView.as_view()),
    path("sign-out/", SignOutView.as_view()),
    path("session/", SessionView.as_view()),
    path("manage/", CreatePortalView.as_view()),
    path("manage/<slug:slug>/", ManageView.as_view()),
    path("<slug:slug>/work/", WorkView.as_view()),
    path("<slug:slug>/work/<uuid:issue_id>/", TaskView.as_view()),
    path("<slug:slug>/work/<uuid:issue_id>/files/", FilesView.as_view()),
    path("<slug:slug>/work/<uuid:issue_id>/files/<uuid:asset_id>/", FilesView.as_view()),
    path("<slug:slug>/documents/", DocumentsView.as_view()),
    path("<slug:slug>/documents/<uuid:page_id>/", DocumentsView.as_view()),
    path("<slug:slug>/documents/<uuid:page_id>/files/<uuid:asset_id>/", FilesView.as_view()),
]
