package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Success bool    `json:"success"`
	Token   string  `json:"token"`
	User    UserDTO `json:"user"`
}

type UserDTO struct {
	Username string `json:"username"`
	Role     string `json:"role"`
	Name     string `json:"name"`
}

// HandleLogin authenticates users. Default admin credentials are admin / admin@123.
func HandleLogin() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username and password are required"})
			return
		}

		// Check default admin credentials
		if req.Username == "admin" && req.Password == "admin@123" {
			c.JSON(http.StatusOK, LoginResponse{
				Success: true,
				Token:   "vestor-admin-session-token",
				User: UserDTO{
					Username: "admin",
					Role:     "ADMIN",
					Name:     "Platform Administrator",
				},
			})
			return
		}

		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials. For Admin, use username 'admin' and password 'admin@123'"})
	}
}
